import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;
const LOWERCASE_RE = /[a-z]/;
const UPPERCASE_RE = /[A-Z]/;
const NUMBER_RE = /[0-9]/;

@ValidatorConstraint({ name: 'isPasswordStrong', async: false })
export class IsPasswordStrongConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'string') return false;
    if (value.length < MIN_LENGTH || value.length > MAX_LENGTH) return false;
    return LOWERCASE_RE.test(value) && UPPERCASE_RE.test(value) && NUMBER_RE.test(value);
  }

  defaultMessage(): string {
    return `password must be ${MIN_LENGTH}-${MAX_LENGTH} characters and include at least one uppercase letter, one lowercase letter, and one number`;
  }
}

export function IsPasswordStrong(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPasswordStrongConstraint,
    });
  };
}
