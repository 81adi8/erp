// Teacher Detail Page
import { useParams } from 'react-router-dom';

export default function TeacherDetailPage() {
    const { id } = useParams();
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Teacher Details</h1>
            <p className="text-muted-foreground">Viewing teacher ID: {id}</p>
        </div>
    );
}
