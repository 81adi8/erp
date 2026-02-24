interface FormErrorProps {
    message?: string;
}

export function FormError({ message }: FormErrorProps) {
    if (!message) return null;

    return (
        <div className="text-red-500 text-sm">
            {message}
        </div>
    );
}
