const topProducts = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `Товар ${i + 1}`,
  qty: Math.floor(Math.random() * 500) + 50,
}));

export default function TopProducts() {
  return (
    <div className="top-list">
      <h3>Топ-10 Товаров</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Товар</th>
            <th>Кол-во (шт.)</th>
          </tr>
        </thead>
        <tbody>
          {topProducts.map((p, i) => (
            <tr key={p.id}>
              <td>{i + 1}</td>
              <td>{p.name}</td>
              <td>{p.qty}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}