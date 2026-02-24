import { useFormContext, type FieldValues, type Path } from 'react-hook-form';

interface FormInputProps<T extends FieldValues> {
    name: Path<T>;
    label: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
}

export function FormInput<T extends FieldValues>({
    name,
    label,
    type = 'text',
    placeholder,
    required,
}: FormInputProps<T>) {
    const { register, formState: { errors } } = useFormContext<T>();
    const error = errors[name];

    return (
        <div className="form-field">
            <label htmlFor={name}>
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            <input
                id={name}
                type={type}
                placeholder={placeholder}
                {...register(name)}
                className={error ? 'border-red-500' : ''}
            />
            {error && (
                <span className="text-red-500 text-sm">
                    {String(error.message)}
                </span>
            )}
        </div>
    );
}
