import { applyDecorators } from '@nestjs/common';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { INPUT_LENGTH } from '@shared/constants/input-length';

export function RequiredCodeField(max: number = INPUT_LENGTH.code): PropertyDecorator {
  return applyDecorators(
    IsString(),
    IsNotEmpty(),
    MaxLength(max),
  );
}

export function RequiredNameField(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    IsNotEmpty(),
    MaxLength(INPUT_LENGTH.name),
  );
}

export function RequiredTextField(max: number = INPUT_LENGTH.text): PropertyDecorator {
  return applyDecorators(IsString(), IsNotEmpty(), MaxLength(max));
}

export function OptionalTextField(max: number = INPUT_LENGTH.text): PropertyDecorator {
  return applyDecorators(IsOptional(), IsString(), MaxLength(max));
}
