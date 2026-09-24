export default function HomePage({ setPage }) {
  return (
    <div>
      <h1>Главная страница</h1>

      <button onClick={() => setPage('documents')}>
        Документы
      </button>

      <button onClick={() => setPage('export')}>
        Экспорт
      </button>

      <button onClick={() => setPage('invoice')}>
        Счёт-фактура
      </button>
    </div>
  );
}