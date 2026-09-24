// src/utils/numberToWords.js

export function amountToWordsMDL(amount) {
  const num = Number(amount);

  if (isNaN(num)) return '';

  let lei = Math.floor(num);
  let bani = Math.round((num - lei) * 100);

  if (bani === 100) {
    lei += 1;
    bani = 0;
  }

  const leiText = convertNumberToWordsRu(lei);

  return `${leiText} леев ${String(bani).padStart(2, '0')} банов`;
}

// Упрощённый конвертер целых чисел до 999 999 в пропись
function convertNumberToWordsRu(n) {
  if (n === 0) return 'Ноль';
  
  const units = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

  function parseThreeDigits(num) {
    let str = '';
    const h = Math.floor(num / 100);
    const t = Math.floor((num % 100) / 10);
    const u = num % 10;

    if (h > 0) str += hundreds[h] + ' ';
    if (t === 1) {
      str += teens[u] + ' ';
    } else {
      if (t > 1) str += tens[t] + ' ';
      if (u > 0) str += units[u] + ' ';
    }
    return str.trim();
  }

  let result = '';
  const thousands = Math.floor(n / 1000);
  const remainder = n % 1000;

  if (thousands > 0) {
    result += parseThreeDigits(thousands) + ' тысяч ';
  }
  if (remainder > 0 || result === '') {
    result += parseThreeDigits(remainder);
  }

  const finalResult = result.trim();
  return finalResult.charAt(0).toUpperCase() + finalResult.slice(1);
}