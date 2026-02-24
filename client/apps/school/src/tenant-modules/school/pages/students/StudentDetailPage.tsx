// Student Detail Page
import { useParams } from 'react-router-dom';

export default function StudentDetailPage() {
    const { id } = useParams();

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Student Details</h1>
            <p className="text-muted-foreground">Viewing student ID: {id}</p>
            {/* TODO: Implement full student detail view */}
        </div>
    );
}
