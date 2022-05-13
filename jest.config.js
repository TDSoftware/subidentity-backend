/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {'^.+\\.(t|j)sx?$': 'ts-jest'},
  testRegex: '((\\.|/)(test|spec))\\.(jsx?|tsx?)$',
  moduleFileExtensions:  ["ts", "tsx", "js", "jsx", "json", "node"]
}
