/**
 * @file auth-profile.test.js
 * @description Tests for the account operations that enforce the security rules.
 *
 * These run under Node, without a browser or Firebase, because every function in
 * `auth-profile.js` takes the SDK as an argument. That was the point of splitting
 * it out: the verification gate is the thing that was broken, so it is the thing
 * that has to be covered by a test rather than by a manual click-through.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  changePassword,
  confirmPassword,
  deleteAccount,
  hasPasswordProvider,
  isVerified,
  providerLabel,
  refreshVerification,
  requestEmailChange,
  sendVerification,
  updateDisplayName,
} from "./auth-profile.js";

/* ---------------------------------------------------------------- fakes */

/** A Firebase `User` with only the surface these functions touch. */
function fakeUser(overrides = {}) {
  return {
    uid: "uid-1",
    email: "nur@example.com",
    emailVerified: false,
    displayName: "Nur",
    providerData: [{ providerId: "password" }],
    reloadCalls: 0,
    async reload() {
      this.reloadCalls += 1;
    },
    async delete() {},
    ...overrides,
  };
}

/** A minimal `firebase/auth` namespace. */
function fakeSdk(overrides = {}) {
  const calls = {
    sendEmailVerification: 0,
    updateProfile: [],
    updatePassword: [],
    verifyBeforeUpdateEmail: [],
    reauthenticate: [],
  };

  const sdk = {
    calls,
    authModule: {
      async sendEmailVerification() {
        calls.sendEmailVerification += 1;
      },
      async updateProfile(_user, profile) {
        calls.updateProfile.push(profile);
      },
      async updatePassword(_user, password) {
        calls.updatePassword.push(password);
      },
      async verifyBeforeUpdateEmail(_user, email) {
        calls.verifyBeforeUpdateEmail.push(email);
      },
      EmailAuthProvider: {
        credential: (email, password) => ({ email, password }),
      },
      async reauthenticateWithCredential(_user, credential) {
        calls.reauthenticate.push(credential);
      },
      ...overrides,
    },
  };
  return sdk;
}

/* ------------------------------------------------------- the gate itself */

describe("verification state", () => {
  it("reports an unverified password account as unverified", () => {
    assert.equal(isVerified(fakeUser({ emailVerified: false })), false);
  });

  it("reports a verified account as verified", () => {
    assert.equal(isVerified(fakeUser({ emailVerified: true })), true);
  });

  it("treats a missing user as unverified rather than verified", () => {
    // Fail closed: no user is never "fine".
    assert.equal(isVerified(null), false);
  });

  it("refreshes the provider record so a link opened in another tab is picked up", async () => {
    const user = fakeUser();
    const result = await refreshVerification(user);

    assert.deepEqual(result, { ok: true });
    assert.equal(user.reloadCalls, 1);
  });

  it("surfaces a reload failure instead of claiming success", async () => {
    const user = fakeUser({
      async reload() {
        throw Object.assign(new Error("offline"), { code: "auth/network-request-failed" });
      },
    });

    const result = await refreshVerification(user);

    assert.equal(result.ok, false);
    assert.equal(result.code, "auth/network-request-failed");
  });
});

describe("sending verification mail", () => {
  it("sends to an unverified account", async () => {
    const sdk = fakeSdk();
    const result = await sendVerification(fakeUser(), sdk);

    assert.equal(result.ok, true);
    assert.equal(sdk.calls.sendEmailVerification, 1);
  });

  it("does not send to an already-verified account", async () => {
    const sdk = fakeSdk();
    const result = await sendVerification(fakeUser({ emailVerified: true }), sdk);

    assert.equal(result.ok, true);
    assert.equal(result.code, "already-verified");
    assert.equal(sdk.calls.sendEmailVerification, 0);
  });

  it("reports Firebase rate limiting as a failure with a code", async () => {
    const sdk = fakeSdk({
      async sendEmailVerification() {
        throw Object.assign(new Error("slow down"), { code: "auth/too-many-requests" });
      },
    });

    const result = await sendVerification(fakeUser(), sdk);

    assert.equal(result.ok, false);
    assert.equal(result.code, "auth/too-many-requests");
  });

  it("fails safely when there is no user", async () => {
    const result = await sendVerification(null, fakeSdk());
    assert.equal(result.ok, false);
    assert.equal(result.code, "no-user");
  });
});

/* ------------------------------------------------------------- profiles */

describe("provider detection", () => {
  it("recognises a password account", () => {
    assert.equal(hasPasswordProvider(fakeUser()), true);
  });

  it("recognises a Google-only account as having no password", () => {
    const user = fakeUser({ providerData: [{ providerId: "google.com" }] });
    assert.equal(hasPasswordProvider(user), false);
  });

  it("does not claim a password when there is no user", () => {
    assert.equal(hasPasswordProvider(null), false);
  });

  it("labels the sign-in method for the settings page", () => {
    assert.equal(providerLabel(fakeUser()), "Email and password");
    assert.equal(
      providerLabel(fakeUser({ providerData: [{ providerId: "google.com" }] })),
      "Google",
    );
  });
});

describe("changing the display name", () => {
  it("trims and forwards a valid name", async () => {
    const sdk = fakeSdk();
    const result = await updateDisplayName(fakeUser(), sdk, "  Nur Islam  ");

    assert.equal(result.ok, true);
    assert.deepEqual(sdk.calls.updateProfile, [{ displayName: "Nur Islam" }]);
  });

  it("accepts names with Bengali marks", async () => {
    // The validator regression that motivated the server-side tests: vowel signs
    // are Unicode marks, not letters.
    const sdk = fakeSdk();
    const result = await updateDisplayName(fakeUser(), sdk, "রুমা ইসলাম");

    assert.equal(result.ok, true);
    assert.equal(sdk.calls.updateProfile[0].displayName, "রুমা ইসলাম");
  });

  it("rejects a one-character name", async () => {
    const sdk = fakeSdk();
    const result = await updateDisplayName(fakeUser(), sdk, "N");

    assert.equal(result.ok, false);
    assert.equal(result.code, "invalid-name");
    assert.equal(sdk.calls.updateProfile.length, 0);
  });

  it("rejects a name over 40 characters", async () => {
    const sdk = fakeSdk();
    const result = await updateDisplayName(fakeUser(), sdk, "N".repeat(41));

    assert.equal(result.ok, false);
    assert.equal(result.code, "invalid-name");
  });
});

/* ------------------------------------------------------------- security */

describe("confirming a password before a sensitive change", () => {
  it("re-authenticates with the supplied password", async () => {
    const sdk = fakeSdk();
    const result = await confirmPassword(fakeUser(), sdk, "correct-horse");

    assert.equal(result.ok, true);
    assert.deepEqual(sdk.calls.reauthenticate, [
      { email: "nur@example.com", password: "correct-horse" },
    ]);
  });

  it("turns a wrong password into a clear message", async () => {
    const sdk = fakeSdk({
      async reauthenticateWithCredential() {
        throw Object.assign(new Error("nope"), { code: "auth/wrong-password" });
      },
    });

    const result = await confirmPassword(fakeUser(), sdk, "wrong");

    assert.equal(result.ok, false);
    assert.match(result.message, /does not match/i);
  });
});

describe("changing the password", () => {
  it("rejects anything shorter than eight characters before calling Firebase", async () => {
    const sdk = fakeSdk();
    const result = await changePassword(fakeUser(), sdk, "short");

    assert.equal(result.ok, false);
    assert.equal(result.code, "weak-password");
    assert.equal(sdk.calls.updatePassword.length, 0);
  });

  it("updates an acceptable password", async () => {
    const sdk = fakeSdk();
    const result = await changePassword(fakeUser(), sdk, "a-long-enough-password");

    assert.equal(result.ok, true);
    assert.deepEqual(sdk.calls.updatePassword, ["a-long-enough-password"]);
  });

  it("reports a stale session as needing a fresh confirmation", async () => {
    const sdk = fakeSdk({
      async updatePassword() {
        throw Object.assign(new Error("stale"), { code: "auth/requires-recent-login" });
      },
    });

    const result = await changePassword(fakeUser(), sdk, "a-long-enough-password");

    assert.equal(result.ok, false);
    assert.equal(result.code, "auth/requires-recent-login");
  });
});

describe("changing the email address", () => {
  it("sends a confirmation to the new address and does not change the old one", async () => {
    const sdk = fakeSdk();
    const user = fakeUser({ emailVerified: true });
    const result = await requestEmailChange(user, sdk, "new@example.com");

    assert.equal(result.ok, true);
    assert.deepEqual(sdk.calls.verifyBeforeUpdateEmail, ["new@example.com"]);
    // The security property: the account still points at the old address.
    assert.equal(user.email, "nur@example.com");
  });

  it("rejects a malformed address locally", async () => {
    const sdk = fakeSdk();
    const result = await requestEmailChange(fakeUser(), sdk, "not-an-email");

    assert.equal(result.ok, false);
    assert.equal(result.code, "invalid-email");
    assert.equal(sdk.calls.verifyBeforeUpdateEmail.length, 0);
  });

  it("refuses to 'change' to the current address", async () => {
    const sdk = fakeSdk();
    const result = await requestEmailChange(fakeUser(), sdk, "NUR@example.com");

    assert.equal(result.ok, false);
    assert.equal(result.code, "same-email");
  });

  it("explains an address already used by another account", async () => {
    const sdk = fakeSdk({
      async verifyBeforeUpdateEmail() {
        throw Object.assign(new Error("taken"), { code: "auth/email-already-in-use" });
      },
    });

    const result = await requestEmailChange(fakeUser(), sdk, "taken@example.com");

    assert.equal(result.ok, false);
    assert.match(result.message, /already uses that address/i);
  });
});

describe("deleting the account", () => {
  it("deletes and reports success", async () => {
    let deleted = false;
    const user = fakeUser({
      async delete() {
        deleted = true;
      },
    });

    const result = await deleteAccount(user);

    assert.equal(result.ok, true);
    assert.equal(deleted, true);
  });

  it("does not report success when Firebase refuses", async () => {
    const user = fakeUser({
      async delete() {
        throw Object.assign(new Error("stale"), { code: "auth/requires-recent-login" });
      },
    });

    const result = await deleteAccount(user);

    assert.equal(result.ok, false);
    assert.equal(result.code, "auth/requires-recent-login");
  });
});
