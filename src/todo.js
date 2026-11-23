// Mini todo list module used as a shared target for the Concord test.
const todos = [];
let nextId = 1;

export function addTodo(title) {
  if (!title || !title.trim()) throw new Error('title required');
  const todo = { id: nextId++, title: title.trim(), done: false };
  todos.push(todo);
  return todo;
}

export function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (!todo) throw new Error(`todo ${id} not found`);
  todo.done = !todo.done;
  return todo;
}

export function removeTodo(id) {
  const index = todos.findIndex((t) => t.id === id);
  if (index === -1) throw new Error(`todo ${id} not found`);
  return todos.splice(index, 1)[0];
}

export function listTodos() {
  return [...todos];
}
