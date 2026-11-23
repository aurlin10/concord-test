import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addTodo, toggleTodo, removeTodo, listTodos } from '../src/todo.js';

test('removeTodo deletes the todo', () => {
  const t = addTodo('temporary');
  removeTodo(t.id);
  assert.equal(listTodos().some((x) => x.id === t.id), false);
});

test('ids stay unique after a removal (review finding)', () => {
  const a = addTodo('a');
  addTodo('b');
  removeTodo(a.id);
  addTodo('c');
  const ids = listTodos().map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('toggleTodo flips done and back', () => {
  const t = addTodo('write note to Alex');
  assert.equal(toggleTodo(t.id).done, true);
  assert.equal(toggleTodo(t.id).done, false);
});

test('toggleTodo rejects unknown ids', () => {
  assert.throws(() => toggleTodo(999), /not found/);
});

test('listTodos returns a copy', () => {
  const list = listTodos();
  list.push({});
  assert.notEqual(listTodos().length, list.length);
});
