// Mini todo list module used as a shared target for the Concord test.
const todos = [];

export function addTodo(title) {
  if (!title || !title.trim()) throw new Error('title required');
  const todo = { id: todos.length + 1, title: title.trim(), done: false };
  todos.push(todo);
  return todo;
}

export function listTodos() {
  return [...todos];
}
