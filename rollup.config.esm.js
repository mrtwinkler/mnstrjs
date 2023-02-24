import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import {terser} from 'rollup-plugin-terser'
import {uglify} from 'rollup-plugin-uglify'

export default {
  input: './src/class.mnstr.js',

  output: [
    {
      name: 'MNSTR',
      file: 'dist/mnstr.esm.js',
      format: 'es'
    }
  ],

  plugins: [
    resolve(),
    commonjs({
      include: 'node_modules/**'
    }),
    terser(),
    uglify(),
  ]
}
