import resolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import {terser} from 'rollup-plugin-terser'
import {uglify} from 'rollup-plugin-uglify'

export default {
  input: './src/class.mnstr.js',

  output: [
    {
      name: 'MNSTR',
      file: 'dist/mnstr.umd.js',
      format: 'umd'
    }
  ],

  plugins: [
    resolve(),
    commonjs({
      include: 'node_modules/**'
    }),
    babel({
      runtimeHelpers: true,
      exclude: 'node_modules/**'
    }),
    terser(),
    uglify(),
  ]
}
