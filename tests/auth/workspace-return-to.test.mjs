import assert from 'node:assert/strict'
import { test } from 'node:test'
import { workspaceReturnTo } from '../../shared/workspace-return-to.ts'

test('return paths stay inside the workspace', () => {
  assert.equal(workspaceReturnTo('/app/reports/report-injury?sort=date#details'), '/app/reports/report-injury?sort=date#details')
  for (const value of [null, 'https://evil.example', '//evil.example/path', '/app/../sign-in', '/app-other', '/app\\evil', '/app\r\nLocation: https://evil.example']) {
    assert.equal(workspaceReturnTo(value), '/app')
  }
})
