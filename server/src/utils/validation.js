const PASS_TYPES = ["Startup Pass", "Innovator Pass"];

export function validateRegistrationInput(payload) {
  const errors = [];
  const name = payload?.name?.trim();
  const email = payload?.email?.trim().toLowerCase();
  const phone = payload?.phone?.trim();
  const passType = payload?.passType?.trim();

  if (!name) {
    errors.push("Full name is required.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("A valid email is required.");
  }

  if (!phone || !/^[0-9+\-\s]{7,20}$/.test(phone)) {
    errors.push("A valid phone number is required.");
  }

  if (!PASS_TYPES.includes(passType)) {
    errors.push("Pass type must be Startup Pass or Innovator Pass.");
  }

  return {
    errors,
    values: { name, email, phone, passType }
  };
}

export function validateStudentUpdateInput(payload) {
  return validateRegistrationInput(payload);
}

export function isValidRegistrationId(registrationId) {
  return typeof registrationId === "string" && /^LP26-[A-Z0-9]{10,}$/.test(registrationId.trim());
}

export { PASS_TYPES };
