import resolve from '@rollup/plugin-node-resolve'

export default {
  input: 'modelo-viewrer',
  output: [
    {
      format: 'esm',
      file: 'bundle.js'
    },
  ],
  plugins: [
    resolve(),
  ]
};