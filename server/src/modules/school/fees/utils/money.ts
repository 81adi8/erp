import Decimal from 'decimal.js';

Decimal.set({
    precision: 40,
    rounding: Decimal.ROUND_HALF_UP,
});

type DecimalInput = Decimal.Value | null | undefined;

export const toDecimal = (value: DecimalInput): Decimal => {
    if (value === null || value === undefined || value === '') {
        return new Decimal(0);
    }

    return new Decimal(value);
};

export const toMoneyDecimal = (value: DecimalInput): Decimal =>
    toDecimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

export const toMoneyString = (value: DecimalInput): string =>
    toMoneyDecimal(value).toFixed(2);

export const toMoneyNumber = (value: DecimalInput): number =>
    Number(toMoneyString(value));

export const maxDecimal = (left: DecimalInput, right: DecimalInput): Decimal =>
    Decimal.max(toDecimal(left), toDecimal(right));

export const minDecimal = (left: DecimalInput, right: DecimalInput): Decimal =>
    Decimal.min(toDecimal(left), toDecimal(right));

