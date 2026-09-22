const topClients = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `Клиент ${i + 1}`,
  total: (Math.floor(Math.random() * 20000) + 5000).toLocaleString('ru-RU'),
}));

export default function TopClients() {
  return (
    <div className="top-list">
      <h3>Топ-10 Клиентов</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Клиент</th>
            <th>Сумма</th>
          </tr>
        </thead>
        <tbody>
          {topClients.map((c, i) => (
            <tr key={c.id}>
              <td>{i + 1}</td>
              <td>{c.name}</td>
              <td>{c.total} MDL</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}