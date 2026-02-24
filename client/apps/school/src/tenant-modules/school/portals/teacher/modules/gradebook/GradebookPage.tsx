import { FileSpreadsheet } from 'lucide-react';
export default function GradebookPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-8 h-8 text-purple-600" />
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gradebook</h1>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400">Gradebook module coming soon...</p>
            </div>
        </div>
    );
}
