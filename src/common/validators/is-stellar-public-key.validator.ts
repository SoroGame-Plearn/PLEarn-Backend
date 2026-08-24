import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { StrKey } from '@stellar/stellar-sdk';

@ValidatorConstraint({ name: 'isStellarPublicKey', async: false })
export class IsStellarPublicKeyConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && StrKey.isValidEd25519PublicKey(value);
  }

  defaultMessage(): string {
    return 'stellarPublicKey must be a valid Stellar ed25519 public key (starts with "G", 56 characters)';
  }
}

export function IsStellarPublicKey(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsStellarPublicKeyConstraint,
    });
  };
}
