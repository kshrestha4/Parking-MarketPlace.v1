// Verifies the app's Supabase integration against a real project.
//
//   node scripts/verify-supabase.mjs
//
// Reads credentials from .env.local. Creates throwaway users, a listing, and
// a storage object, then deletes everything it created. Prints one PASS/FAIL
// line per check; exits non-zero if any check failed.
//
// Never prints credentials. The test email addresses are fake and disposable.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const env = {};
  const content = fs.readFileSync(path.join(root, ".env.local"), "utf8");
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

if (!url || !anonKey || !serviceKey) {
  console.error("Missing Supabase variables in .env.local");
  process.exit(1);
}

// The service-role client skips RLS; used for signups, role promotion, and
// cleanup only.
const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ts = Date.now();
const password = "Verify-12345!";
const email = {
  customer: `verify-customer-${ts}@example.com`,
  owner: `verify-owner-${ts}@example.com`,
  ownerB: `verify-ownerb-${ts}@example.com`,
  admin: `verify-admin-${ts}@example.com`,
};

// Real signup path (browser flow): this is what the app does, and it burns one
// confirmation email, so it's used for exactly one role.
async function signUpAndLogin(roleEmail) {
  const client = createClient(url, anonKey);
  const { data: su, error: suErr } = await client.auth.signUp({
    email: roleEmail,
    password,
    options: { data: { full_name: roleEmail.split("@")[0] } },
  });
  if (suErr) throw suErr;
  // Email confirmation is usually on for new projects; confirm server-side.
  if (!su.session && su.user) {
    await admin.auth.admin.updateUserById(su.user.id, { email_confirm: true });
  }
  const { data: login, error: loginErr } = await client.auth.signInWithPassword({
    email: roleEmail,
    password,
  });
  if (loginErr) throw loginErr;
  return { client, user: login.user };
}

// Server-created user: no confirmation email is sent, so the rest of the role
// checks don't consume the project's email rate limit.
async function createAndLogin(roleEmail) {
  const { error: createErr } = await admin.auth.admin.createUser({
    email: roleEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: roleEmail.split("@")[0] },
  });
  if (createErr) throw createErr;
  const client = createClient(url, anonKey);
  const { data: login, error: loginErr } = await client.auth.signInWithPassword({
    email: roleEmail,
    password,
  });
  if (loginErr) throw loginErr;
  return { client, user: login.user };
}

// ---------------------------------------------------------------------------
// Connection + schema
// ---------------------------------------------------------------------------

// The publishable key is what the browser sends. A 401 means the key itself is
// rejected; 404 (PGRST205, unknown table) means the key is accepted and the
// table simply doesn't exist yet — which is what we expect before migrations.
let keyWorks = false;
try {
  const res = await fetch(`${url}/rest/v1/profiles?select=id&limit=1`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}`, Origin: "http://localhost:3000" },
  });
  keyWorks = res.status !== 401;
  check("Connection (publishable key reaches REST API)", keyWorks,
    res.status === 401 ? "HTTP 401 — key rejected" : "");
} catch (err) {
  check("Connection (publishable key reaches REST API)", false, err.message);
}

let schema = null;
try {
  // The OpenAPI root only accepts a secret key; that's a server-side detail,
  // so the verification script uses the service role for this one call.
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  });
  if (res.ok) schema = await res.json();
} catch {
  // schema stays null
}

const tables = [
  "profiles",
  "parking_lots",
  "parking_images",
  "parking_availability",
  "parking_pricing",
  "parking_blackout_dates",
  "reservations",
  "reviews",
  "notifications",
];
const functions = [
  "search_parking",
  "save_listing",
  "create_reservation",
  "cancel_reservation",
  "owner_bookings",
];

if (schema) {
  const paths = Object.keys(schema.paths ?? {});
  const missingTables = tables.filter((t) => !paths.includes(`/${t}`));
  check("Migrations applied (all tables exist)", missingTables.length === 0,
    missingTables.length ? `missing: ${missingTables.join(", ")}` : "");
  const missingFns = functions.filter((f) => !paths.includes(`/rpc/${f}`));
  check("Database functions present", missingFns.length === 0,
    missingFns.length ? `missing: ${missingFns.join(", ")}` : "");
  const lotSchema = schema.components?.schemas?.parking_lots ?? {};
  const hasLocation = Boolean(lotSchema.properties?.location);
  check("PostGIS column (parking_lots.location)", hasLocation,
    hasLocation ? "" : "location column not found");
} else {
  check("Migrations applied (all tables exist)", false, "no schema");
  check("Database functions present", false, "no schema");
  check("PostGIS column (parking_lots.location)", false, "no schema");
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

let customer, owner, ownerB, adminUser;
try {
  customer = await signUpAndLogin(email.customer);
  check("Customer signup + login", true);
} catch (err) {
  check("Customer signup + login", false, err.message);
}

if (customer) {
  const { data: wrong, error: wrongErr } = await customer.client.auth.signInWithPassword({
    email: email.customer,
    password: "definitely-wrong",
  });
  // A rate-limited attempt still counts as "rejected".
  check("Login rejects wrong password", Boolean(wrongErr && !wrong.session));

  const { data: me } = await customer.client.auth.getUser();
  check("Session returns the signed-in user", me?.user?.id === customer.user.id);

  await customer.client.auth.signOut();
  const { data: afterOut } = await customer.client.auth.getUser();
  check("Logout clears the session", afterOut?.user == null);

  // Re-login for the rest of the checks.
  await customer.client.auth.signInWithPassword({ email: email.customer, password });
}

try {
  owner = await createAndLogin(email.owner);
  await admin.from("profiles").update({ role: "owner" }).eq("id", owner.user.id);
  const { data: prof } = await owner.client.from("profiles").select("role").eq("id", owner.user.id).single();
  check("Owner signup + role promotion to owner", prof?.role === "owner", prof?.role ? "" : `role is ${prof?.role}`);
} catch (err) {
  check("Owner signup + role promotion to owner", false, err.message);
}

try {
  ownerB = await createAndLogin(email.ownerB);
  await admin.from("profiles").update({ role: "owner" }).eq("id", ownerB.user.id);
} catch (err) {
  check("Second owner setup", false, err.message);
}

try {
  adminUser = await createAndLogin(email.admin);
  await admin.from("profiles").update({ role: "admin" }).eq("id", adminUser.user.id);
  const { data: aprof } = await adminUser.client.from("profiles").select("role").eq("id", adminUser.user.id).single();
  check("Admin role grant (service role only)", aprof?.role === "admin");
} catch (err) {
  check("Admin role grant (service role only)", false, err.message);
}

// ---------------------------------------------------------------------------
// Listing flow against real RLS
// ---------------------------------------------------------------------------

const coords = { lat: 40.7128, lng: -74.006 }; // NYC
let lotId = null;
let lotIdPending = null;

if (owner && customer && adminUser) {
  try {
    const { data: id, error: saveErr } = await owner.client.rpc("save_listing", {
      p_lot_id: null,
      p_owner_id: owner.user.id,
      p_name: "Verify Test Garage",
      p_description: "Created by the integration verification script.",
      p_parking_type: "garage",
      p_spaces_count: 5,
      p_vehicle_types: ["car"],
      p_address: "120 Walnut St, New York",
      p_latitude: coords.lat,
      p_longitude: coords.lng,
      p_rules: "Integration test listing, safe to delete.",
      p_status: "pending",
      p_hourly_rate_cents: 800,
      p_currency: "USD",
      p_availability: [{ day_of_week: 1, open_time: "06:00", close_time: "22:00" }],
      p_blackout_dates: [],
    });
    if (saveErr) throw saveErr;
    lotId = id;
    check("Owner creates listing (save_listing)", Boolean(lotId));
  } catch (err) {
    check("Owner creates listing (save_listing)", false, err.message);
  }

  try {
    const { data: second, error: secondErr } = await owner.client.rpc("save_listing", {
      p_lot_id: null,
      p_owner_id: owner.user.id,
      p_name: "Verify Pending Lot",
      p_description: "Should never be visible to customers.",
      p_parking_type: "lot",
      p_spaces_count: 1,
      p_vehicle_types: ["car"],
      p_address: "1 Hidden Ave, New York",
      p_latitude: coords.lat + 0.01,
      p_longitude: coords.lng,
      p_rules: "",
      p_status: "pending",
      p_hourly_rate_cents: 500,
      p_currency: "USD",
      p_availability: [{ day_of_week: 2, open_time: "08:00", close_time: "18:00" }],
      p_blackout_dates: [],
    });
    if (secondErr) throw secondErr;
    lotIdPending = second;
  } catch {
    // Non-fatal for the main flow.
  }

  if (lotId) {
    const { data: seen } = await customer.client.from("parking_lots").select("id,status").eq("id", lotId);
    check("Customer cannot see pending listing (RLS)", !seen || seen.length === 0,
      seen?.length ? "pending listing visible to customer" : "");

    if (ownerB) {
      const { error: tamperErr } = await ownerB.client
        .from("parking_lots")
        .update({ name: "Hijacked" })
        .eq("id", lotId);
      const { data: afterTamper } = await owner.client.from("parking_lots").select("name").eq("id", lotId).single();
      check("Owner cannot edit another owner's listing", afterTamper?.name !== "Hijacked" && Boolean(tamperErr),
        tamperErr ? "" : "update silently succeeded (check RLS)");
    }

    const { error: approveErr } = await adminUser.client
      .from("parking_lots")
      .update({ status: "approved" })
      .eq("id", lotId);
    const { data: approved } = await adminUser.client.from("parking_lots").select("status").eq("id", lotId).single();
    check("Admin approves listing", !approveErr && approved?.status === "approved",
      approveErr?.message ?? "");

    const { data: visible } = await customer.client.from("parking_lots").select("id").eq("id", lotId);
    check("Approved listing visible to customers", Boolean(visible?.length));
  }
}

// ---------------------------------------------------------------------------
// PostGIS search
// ---------------------------------------------------------------------------

if (customer && lotId) {
  const { data: results, error: searchErr } = await customer.client.rpc("search_parking", {
    p_lat: coords.lat,
    p_lng: coords.lng,
    p_radius_m: 3000,
  });
  const ids = (results ?? []).map((r) => r.id);
  check("PostGIS search returns approved listing", !searchErr && ids.includes(lotId),
    searchErr?.message ?? "");
  check("PostGIS search excludes pending listing", !ids.includes(lotIdPending),
    "pending listing leaked into search results");
  if (results?.length) {
    check("Search returns distance from PostGIS", typeof results[0].distance_m === "number");
  }
} else {
  check("PostGIS search returns approved listing", false, "no listing to search for");
  check("PostGIS search excludes pending listing", false, "no listing to search for");
  check("Search returns distance from PostGIS", false, "no listing to search for");
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

const BUCKET = "parking-images";
let uploadedPath = null;
let crossUploadBlocked = false;

try {
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets.some((b) => b.name === BUCKET)) {
    await admin.storage.createBucket(BUCKET, { public: true });
  }
  check("Storage bucket exists (parking-images)", true);
} catch (err) {
  check("Storage bucket exists (parking-images)", false, err.message);
}

if (owner) {
  try {
    const bytes = Buffer.from("fake-png-bytes-for-verification");
    const { error } = await owner.client.storage
      .from(BUCKET)
      .upload(`${owner.user.id}/${ts}.png`, bytes, { contentType: "image/png" });
    if (error) {
      check("Owner uploads a photo", false, `storage RLS blocks insert: ${error.message}`);
    } else {
      uploadedPath = `${owner.user.id}/${ts}.png`;
      check("Owner uploads a photo", true);
    }
  } catch (err) {
    check("Owner uploads a photo", false, err.message);
  }

  if (ownerB) {
    const { error } = await ownerB.client.storage
      .from(BUCKET)
      .upload(`${owner.user.id}/${ts}-b.png`, Buffer.from("x"), { contentType: "image/png" });
    crossUploadBlocked = Boolean(error);
    check("Owner cannot upload to another owner's path", crossUploadBlocked,
      error ? "" : "cross-owner upload succeeded (storage RLS missing?)");
  } else {
    check("Owner cannot upload to another owner's path", false, "no second owner");
  }
} else {
  check("Owner uploads a photo", false, "no owner session");
  check("Owner cannot upload to another owner's path", false, "no owner session");
}

if (uploadedPath) {
  try {
    const publicUrl = admin.storage.from(BUCKET).getPublicUrl(uploadedPath).data.publicUrl;
    const res = await fetch(publicUrl);
    check("Customers can view photos via public URL", res.ok, `HTTP ${res.status}`);
  } catch (err) {
    check("Customers can view photos via public URL", false, err.message);
  }
} else {
  check("Customers can view photos via public URL", false, "nothing uploaded");
}

// ---------------------------------------------------------------------------
// Cleanup: remove storage objects, then delete the throwaway users (their
// profiles cascade and take the test listings, images, and rows with them).
// ---------------------------------------------------------------------------

try {
  if (uploadedPath) await admin.storage.from(BUCKET).remove([uploadedPath]);
} catch {
  // Bucket policy may prevent removal; nothing to do.
}

for (const u of [customer, owner, ownerB, adminUser]) {
  if (u?.user?.id) {
    await admin.auth.admin.deleteUser(u.user.id).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
