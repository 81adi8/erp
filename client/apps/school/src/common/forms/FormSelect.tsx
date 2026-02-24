import { useFormContext, type FieldValues, type Path } from 'react-hook-form';

export interface FormSelectOption {
    value: string;
    label: string;
}

interface FormSelectProps<T extends FieldValues> {
    name: Path<T>;
    label: string;
    options: FormSelectOption[];
    placeholder?: string;
    required?: boolean;
}

export function FormSelect<T extends FieldValues>({
    name,
    label,
    options,
    placeholder = 'Select',
    required,
}: FormSelectProps<T>) {
    const { register, formState: { errors } } = useFormContext<T>();
    const error = errors[name];

    return (
        <div className="form-field">
            <label htmlFor={name}>
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <select id={name} {...register(name)} className={error ? 'border-red-500' : ''}>
                <option value="">{placeholder}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && (
                <span className="text-red-500 text-sm">
                    {String(error.message)}
                </span>
            )}
        </div>
    );
}
