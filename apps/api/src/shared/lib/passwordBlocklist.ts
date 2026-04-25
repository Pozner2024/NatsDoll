// Топ-100 самых распространённых паролей по данным утечек (NordPass/SecLists 2024).
// Используется при регистрации, чтобы отрезать тривиальные пароли, которые ломаются
// первой же словарной атакой ещё до того, как сработают rate-limit и Argon2.
// Все значения в нижнем регистре — сравнение делать через .toLowerCase().

export const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  '123456', '123456789', '12345678', '12345', '1234567', '1234567890', '123123', '123321',
  '111111', '000000', '666666', '696969', '7777777', '11111111', '22222222', '33333333',
  '44444444', '55555555', '88888888', '99999999', '112233', '121212', '147258369', '159357', '159753',
  'password', 'password1', 'password12', 'password123', 'password1234', 'passw0rd', 'p@ssword', 'p@ssw0rd', 'pa$$word',
  'qwerty', 'qwerty1', 'qwerty12', 'qwerty123', 'qwerty1234', 'qwertyuiop', 'qazwsx',
  '1q2w3e', '1q2w3e4r', '1q2w3e4r5t', '1qaz2wsx', 'q1w2e3r4', 'q1w2e3r4t5',
  'asdfgh', 'asdfghjkl', 'asdf1234', 'zxcvbn', 'zxcvbnm', 'abc123', 'abc12345', 'abcd1234', 'abcdef',
  'admin', 'admin123', 'administrator', 'welcome', 'welcome1', 'welcome123', 'login', 'master', 'letmein',
  'iloveyou', 'sunshine', 'princess', 'monkey', 'dragon', 'shadow', 'mustang', 'hunter', 'hottie', 'freedom', 'trustno1',
  'football', 'baseball', 'basketball', 'hockey', 'soccer', 'batman', 'superman', 'starwars', 'pokemon', 'yugioh',
  'michael', 'jessica', 'michelle', 'matthew', 'daniel', 'charlie', 'mickey', 'ashley', 'jordan', 'jordan23',
  'computer', 'internet', 'samsung', 'iphone', 'android', 'google', 'test', 'test123', 'test1234',
  'natsdoll', 'natsdoll123',
])
