import { useState } from 'react';

export default function DocumentsPage() {
  const [selected, setSelected] = useState(null);

  const documents = [
    {
      id: 1,
      number: 'INV-101',
      pdfUrl: '/sample.pdf'
    },
    {
      id: 2,
      number: 'INV-102',
      pdfUrl: '/sample.pdf'
    }
  ];

  return (
    <div className="documents-page">
      <h2>Документы</h2>

      <div className="documents-list">
        {documents.map((doc) => (
          <div
            key={doc.id}
            onClick={() => setSelected(doc)}
            style={{
              cursor: 'pointer',
              padding: '10px',
              border: '1px solid #ccc',
              marginBottom: '5px'
            }}
          >
            {doc.number}
          </div>
        ))}
      </div>

      <div
        className="preview-panel"
        style={{ marginTop: '20px' }}
      >
        {selected ? (
          {selected,pdfUrl}
        ) : (
          <p>Выберите документ для просмотра</p>
        )}
      </div>
    </div>
  );
}