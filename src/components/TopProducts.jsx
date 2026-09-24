export default function TopProducts({ products = [] }) {
  const topProducts = [...products]
    .map((product) => ({
      id: product.id,
      name: product.name || product.productName || "Без названия",
      qty: Number(product.qty ?? product.quantity ?? product.stock ?? product.value ?? 0),
    }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 10);

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
          {topProducts.length === 0 && (
            <tr>
              <td colSpan="3">Нет данных в базе</td>
            </tr>
          )}
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