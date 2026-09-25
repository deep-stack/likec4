import type { TableDefinition } from '@likec4/core'
import { tableGeometry } from '@likec4/core/geometry'

const escape = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')

export function tableLabel(table: TableDefinition, title: string) {
  const geometry = tableGeometry(table, title)
  const cell = (text: string, height: number, port?: string) =>
    `<TR><TD WIDTH="${geometry.width}" HEIGHT="${height}" FIXEDSIZE="TRUE"${port ? ` PORT="${port}"` : ''}>${
      escape(text)
    }</TD></TR>`
  return `<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0">${cell(title, geometry.headerHeight)}${
    geometry.rows.map((row, index) => cell(table.fields[index]!.title, row.height, row.port)).join('')
  }</TABLE>`
}
