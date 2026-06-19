import UploadDocuments from "../UploadDocuments";

export default function TestUploadPage() {
  return (
    <main className="min-h-screen bg-sky-950 text-white p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">
          Test Upload Documents
        </h1>

        <UploadDocuments />
      </div>
    </main>
  );
}