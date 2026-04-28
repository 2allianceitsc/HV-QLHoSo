import { z } from 'zod';
import { INPUT_LENGTH } from '@shared/constants/input-length';

export const requiredCode = (label = 'Code', max: number = INPUT_LENGTH.code) =>
  z
    .string()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

export const requiredName = (label = 'Name') =>
  z
    .string()
    .min(1, `${label} is required`)
    .max(INPUT_LENGTH.name, `${label} must be at most ${INPUT_LENGTH.name} characters`);

export const requiredText = (label: string, max: number = INPUT_LENGTH.text) =>
  z
    .string()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

export const optionalText = (label: string, max: number = INPUT_LENGTH.text) =>
  z.string().max(max, `${label} must be at most ${max} characters`).optional();

export const optionalEmail = (label = 'Email', max: number = INPUT_LENGTH.text) =>
  z
    .string()
    .max(max, `${label} must be at most ${max} characters`)
    .email(`Invalid ${label.toLowerCase()}`)
    .optional()
    .or(z.literal(''));

export const optionalPhone = (label = 'Phone number') =>
  z
    .string()
    .refine(
      (val) => val === '' || /^[+]?[\d\s\-().]{7,20}$/.test(val),
      `Invalid ${label.toLowerCase()} format (7–20 digits, spaces, +, -, ())`
    )
    .optional();

export const optionalNonNegativeInt = (label = 'Value') =>
  z
    .string()
    .refine(
      (val) => val === '' || (/^\d+$/.test(val) && Number(val) >= 0),
      `${label} must be a non-negative whole number`
    )
    .optional();

export const optionalDateOfBirth = (label = 'Date of birth') =>
  z
    .string()
    .refine((val) => {
      if (!val) return true;
      const dob = new Date(val);
      if (isNaN(dob.getTime())) return false;
      const today = new Date();
      const cutoff = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
      return dob <= cutoff;
    }, `${label} must be at least 18 years old`)
    .optional();
