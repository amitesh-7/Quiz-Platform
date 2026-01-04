/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 */
export function isValidPassword(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate name (non-empty, min length)
 */
export function isValidName(name: string, minLength = 2): boolean {
  return name.trim().length >= minLength;
}

/**
 * Validate required field
 */
export function isRequired(value: string | number | undefined | null): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

/**
 * Validate number range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

/**
 * Validate positive number
 */
export function isPositiveNumber(value: string | number): boolean {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return !isNaN(num) && num > 0;
}

/**
 * Validate quiz form
 */
export function validateQuizForm(data: {
  title: string;
  duration: string | number;
  totalMarks: string | number;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!isRequired(data.title)) {
    errors.title = 'Title is required';
  }

  if (!isPositiveNumber(data.duration)) {
    errors.duration = 'Enter a valid duration';
  }

  if (!isPositiveNumber(data.totalMarks)) {
    errors.totalMarks = 'Enter valid total marks';
  }

  return errors;
}

/**
 * Validate login form (teacher)
 */
export function validateTeacherLogin(data: {
  email: string;
  password: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!isRequired(data.email)) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Enter a valid email';
  }

  if (!isRequired(data.password)) {
    errors.password = 'Password is required';
  }

  return errors;
}

/**
 * Validate login form (student)
 */
export function validateStudentLogin(data: {
  name: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!isRequired(data.name)) {
    errors.name = 'Name is required';
  } else if (!isValidName(data.name)) {
    errors.name = 'Enter a valid name (at least 2 characters)';
  }

  return errors;
}

/**
 * Validate registration form
 */
export function validateRegistration(data: {
  name: string;
  email: string;
  password: string;
  secretKey: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!isRequired(data.name)) {
    errors.name = 'Name is required';
  } else if (!isValidName(data.name)) {
    errors.name = 'Enter a valid name';
  }

  if (!isRequired(data.email)) {
    errors.email = 'Email is required';
  } else if (!isValidEmail(data.email)) {
    errors.email = 'Enter a valid email';
  }

  if (!isRequired(data.password)) {
    errors.password = 'Password is required';
  } else {
    const passwordValidation = isValidPassword(data.password);
    if (!passwordValidation.isValid) {
      errors.password = passwordValidation.errors[0];
    }
  }

  if (!isRequired(data.secretKey)) {
    errors.secretKey = 'Secret key is required';
  }

  return errors;
}
