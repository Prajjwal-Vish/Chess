# Minimum Learning Roadmap — Work on This Chess App Without Starting From Scratch

This is not a "learn React completely" guide.
This covers exactly what you need to read, understand, and modify the code in this app.
Each section shows the concept, explains it in plain English, and shows where you will see it in this codebase.

---

## Part 1 — JavaScript Fundamentals You Must Know First

If React and TypeScript feel confusing, it is often because the underlying JavaScript is unfamiliar.
These are the JS patterns used everywhere in this code.

---

### 1.1 Arrow Functions

Old way:
```js
function add(a, b) {
  return a + b
}
```

Arrow function (what this code uses everywhere):
```js
const add = (a, b) => a + b
```

With a block body (when you need multiple lines):
```js
const greet = (name) => {
  const message = 'Hello ' + name
  return message
}
```

**Where you see this in the app:**
Almost every function is an arrow function. Example in `useOnlineGame.ts`:
```ts
const joinMatchmaking = () => {
  // ...
}
```

---

### 1.2 Destructuring

Instead of writing `user.name`, `user.email` etc., you can "unpack" an object:

```js
const user = { name: 'Alice', email: 'alice@x.com', age: 25 }

// Old way
const name = user.name
const email = user.email

// Destructuring
const { name, email } = user
```

Same for arrays:
```js
const [first, second] = ['white', 'black']
// first = 'white', second = 'black'
```

**Where you see this in the app:**
In almost every component and hook. Example in `OnlineGame.tsx`:
```ts
const { state, joinMatchmaking, makeMove, resign } = useOnlineGame()
```

---

### 1.3 Spread Operator `...`

Copies properties from one object into another:

```js
const old = { a: 1, b: 2 }
const updated = { ...old, b: 99 }
// updated = { a: 1, b: 99 }
```

Used constantly when updating React state. Example from `useOnlineGame.ts`:
```ts
setState((s) => ({ ...s, status: 'waiting', error: null }))
// This copies all current state (s), then overrides just status and error
```

---

### 1.4 Template Literals

Instead of `'Hello ' + name`, you write:
```js
const msg = `Hello ${name}`
const url = `http://localhost:${PORT}`
```

---

### 1.5 async / await

JavaScript does not wait for network requests or file reads by default. `async/await` makes it read like normal top-to-bottom code.

```js
// Without async/await (hard to read)
fetch('/api/login').then(res => res.json()).then(data => console.log(data))

// With async/await (easier to read)
async function login() {
  const res = await fetch('/api/login')
  const data = await res.json()
  console.log(data)
}
```

`await` means "pause here and wait for this to finish before moving on".
You can only use `await` inside an `async` function.

**Where you see this in the app:**
Every server function and API call uses async/await. Example in `auth.service.ts`:
```ts
async function loginUser(email, password) {
  const user = await pool.query(...)  // waits for DB result
  return user
}
```

---

### 1.6 Imports and Exports

Every file in this project is a **module**. To use something from another file, you import it.

```js
// Named export (can export multiple things)
export function add(a, b) { return a + b }
export const PI = 3.14

// Named import
import { add, PI } from './math'

// Default export (only one per file)
export default function App() { ... }

// Default import
import App from './App'
```

**Where you see this in the app:**
Every single file. Example in `App.tsx`:
```ts
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/auth/Login'
```

---

## Part 2 — TypeScript Basics

TypeScript is JavaScript with **types** added. Types tell you (and your editor) what kind of data a variable holds. You do not need to understand all of TypeScript — just the patterns used here.

---

### 2.1 Basic Type Annotations

```ts
const name: string = 'Alice'
const age: number = 25
const isLoggedIn: boolean = true
```

In practice, TypeScript can usually figure out the type, so you often do not need to write it:
```ts
const name = 'Alice'  // TypeScript knows this is a string automatically
```

You mostly write types when defining **function parameters**:
```ts
function greet(name: string): string {
  return `Hello ${name}`
}
```

---

### 2.2 Interfaces — Defining Object Shapes

An interface says "this object must have these properties":

```ts
interface User {
  id: string
  username: string
  email: string
  rating: number
}
```

Now if you try to use a User without one of those fields, TypeScript gives you an error.

**Where you see this in the app:**
`useOnlineGame.ts` defines what the game state looks like:
```ts
interface OnlineGameState {
  status: 'idle' | 'waiting' | 'playing' | 'over'
  color: 'white' | 'black'
  fen: string
  // ...
}
```

---

### 2.3 Optional Properties `?`

A `?` means the property might not exist:
```ts
interface User {
  username: string
  bio?: string  // bio might be undefined
}
```

---

### 2.4 Union Types `|`

A value can be one of several types:
```ts
let status: 'idle' | 'waiting' | 'playing' | 'over'
let winner: 'white' | 'black' | 'draw' | null
```

This is much better than just using `string` because TypeScript will warn you if you accidentally set `status = 'loading'` (which is not in the union).

---

### 2.5 `type` vs `interface`

Both define the shape of an object. For this app, treat them as interchangeable:
```ts
type Color = 'white' | 'black'
interface Player { color: Color; id: string }
```

Use `type` for simple unions like `'white' | 'black'`. Use `interface` for objects.

---

### 2.6 Generics `<T>` — Do Not Fear Them

You will see angle brackets like `useState<string>` or `Map<Key, Key[]>`. This just means "a thing that works with this specific type".

```ts
// A state that holds a string
const [name, setName] = useState<string>('')

// A state that holds a User object
const [user, setUser] = useState<User | null>(null)
```

You do not need to write generics yourself much — you mostly see them when reading code. Just know that `<string>` means "this is a string version of this thing".

---

### 2.7 `as` — Type Casting

Sometimes TypeScript does not know what type something is. You can tell it:
```ts
const token = socket.handshake.auth?.token as string
```

This says "trust me, this is a string". Use sparingly — if you lie to TypeScript, you will get runtime errors.

---

### 2.8 Reading Type Errors

When TypeScript shows an error, it almost always means you are passing the wrong type somewhere. Example:

```
Argument of type 'string | null' is not assignable to parameter of type 'string'
```

This means the function expects a `string` but you might be passing `null`. Fix: check for null first:
```ts
if (token !== null) {
  doSomething(token)  // TypeScript now knows it's definitely a string
}
```

---

## Part 3 — React Fundamentals

---

### 3.1 What is a Component?

A component is just a **function that returns HTML-like code** (called JSX):

```tsx
function Greeting() {
  return <h1>Hello world</h1>
}
```

That is it. Components can be used like HTML tags:
```tsx
<Greeting />
```

**Rule:** Component names always start with a capital letter. `<Greeting />` is a component. `<greeting />` would be treated as an HTML tag.

---

### 3.2 JSX — Writing HTML in JavaScript

JSX looks like HTML but has a few differences:

```tsx
// HTML                 // JSX
class="btn"            className="btn"       (class is reserved in JS)
for="email"            htmlFor="email"
onclick="..."          onClick={...}          (camelCase events)
style="color:red"      style={{ color: 'red' }}  (object, not string)
```

JavaScript expressions go inside `{}`:
```tsx
const name = 'Alice'
return <h1>Hello {name}</h1>
// renders: Hello Alice
```

---

### 3.3 Props — Passing Data to Components

Props are like function arguments for components:

```tsx
// Defining a component with props
function PlayerLabel({ name, color }: { name: string; color: string }) {
  return <div>{name} plays {color}</div>
}

// Using it
<PlayerLabel name="Alice" color="white" />
```

**Where you see this in the app:**
`Chessboard.tsx` receives a `config` prop:
```tsx
<Chessboard config={config} />
```

---

### 3.4 State — `useState`

State is data that, when it changes, causes the component to re-render (update on screen).

```tsx
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)  // initial value = 0

  return (
    <div>
      <p>Count: {count}</p>
      <button onClick={() => setCount(count + 1)}>Add</button>
    </div>
  )
}
```

- `count` — the current value (read-only, do not modify directly)
- `setCount` — the function to update it
- When `setCount` is called, React re-renders the component with the new value

**Golden Rule:** Never do `count = count + 1`. Always use the setter function (`setCount`).

**Where you see this in the app:**
`useOnlineGame.ts` uses a big state object:
```ts
const [state, setState] = useState<OnlineGameState>({
  status: 'idle',
  color: 'white',
  // ...
})
```

---

### 3.5 Updating Objects in State

Because you cannot mutate state directly, you use the spread operator to create an updated copy:

```tsx
// WRONG — mutating directly
state.status = 'playing'

// CORRECT — create a new object
setState({ ...state, status: 'playing' })

// Functional form (preferred when new state depends on old state)
setState((prev) => ({ ...prev, status: 'playing' }))
```

---

### 3.6 Effects — `useEffect`

`useEffect` runs code **after** the component renders. Common uses:
- Fetch data when the page loads
- Set up subscriptions
- Clean up when the component is removed

```tsx
useEffect(() => {
  // this runs after every render
})

useEffect(() => {
  // this runs only once (on mount)
}, [])

useEffect(() => {
  // this runs when `userId` changes
}, [userId])

useEffect(() => {
  const timer = setInterval(...)
  return () => clearInterval(timer)  // cleanup function: runs when component unmounts
}, [])
```

**Where you see this in the app:**
`useOnlineGame.ts` uses it to disconnect the socket when you leave the page:
```ts
useEffect(() => {
  return () => disconnectSocket()  // cleanup: runs when OnlineGame unmounts
}, [])
```

---

### 3.7 `useCallback` — Preventing Unnecessary Re-creation of Functions

```tsx
const handleMove = useCallback(
  (from, to) => makeMove(from, to),
  [makeMove]  // only recreate if makeMove changes
)
```

You do not need to deeply understand this. Just know: it is an optimization. If you see `useCallback`, it wraps a function to prevent it being recreated on every render. The array at the end (`[makeMove]`) is the list of dependencies that would cause it to update.

---

### 3.8 Conditional Rendering

Show something only when a condition is true:

```tsx
// Using &&  (show if true)
{isLoggedIn && <UserMenu />}

// Using ternary (show this OR that)
{isLoggedIn ? <UserMenu /> : <LoginButton />}
```

**Where you see this in the app:**
`OnlineGame.tsx` shows different overlays based on game status:
```tsx
{state.status === 'waiting' && (
  <div>Finding opponent...</div>
)}

{state.status === 'idle' && (
  <button onClick={joinMatchmaking}>Find a game</button>
)}
```

---

### 3.9 Rendering Lists — `.map()`

To display an array of items, use `.map()`:

```tsx
const moves = ['e4', 'e5', 'Nf3']

return (
  <ul>
    {moves.map((move, index) => (
      <li key={index}>{move}</li>
    ))}
  </ul>
)
```

The `key` prop is required — React uses it to track items. Use a unique id if available, fall back to index.

---

### 3.10 Event Handlers

```tsx
// onClick
<button onClick={() => console.log('clicked')}>Click me</button>

// onChange (input)
<input onChange={(e) => setEmail(e.target.value)} />

// onSubmit (form)
<form onSubmit={(e) => {
  e.preventDefault()   // prevents page reload
  handleLogin()
}}>
```

---

### 3.11 Custom Hooks — `useXxx`

A custom hook is just a function that:
1. Starts with `use`
2. Can call other hooks inside it (`useState`, `useEffect`, etc.)

It is a way to extract logic out of a component into a reusable piece.

```ts
// Instead of putting all this logic in LocalGame.tsx,
// it lives in useChessGame.ts and LocalGame.tsx just calls:
const { gameState, makeMove, resign } = useChessGame()
```

You do not need to build custom hooks yourself to start — just know that when you see a function starting with `use`, it is a hook and it returns data/functions for a component to use.

---

## Part 4 — Zustand (Global State)

Zustand is a tiny library for state that multiple components need to share. In this app it is only used for auth.

### Reading state in any component:
```tsx
import { useAuthStore } from '../stores/authStore'

function Header() {
  const user = useAuthStore((s) => s.user)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  return <div>{isAuthenticated ? user.username : 'Guest'}</div>
}
```

### Calling actions:
```tsx
const setAuth = useAuthStore((s) => s.setAuth)
const clearAuth = useAuthStore((s) => s.clearAuth)

// After login:
setAuth(user, accessToken)

// After logout:
clearAuth()
```

That is all you need to know about Zustand for this app.

---

## Part 5 — React Router (Navigation)

### Linking between pages (use `<Link>`, not `<a>`):
```tsx
import { Link } from 'react-router-dom'

<Link to="/play/local">Play Local</Link>
<Link to="/">Home</Link>
```

### Navigating programmatically (after login, redirect to home):
```tsx
import { useNavigate } from 'react-router-dom'

const navigate = useNavigate()

async function handleLogin() {
  await login(email, password)
  navigate('/')  // redirect after login
}
```

### Defining routes (in `App.tsx`):
```tsx
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/login" element={<Login />} />
  <Route path="/play/local" element={<LocalGame />} />
</Routes>
```

---

## Part 6 — Practical Skills: Making Changes

These are the exact workflows for common tasks you will do.

---

### How to Add a New Page

1. Create a file in `chess-client/src/pages/MyPage.tsx`:
```tsx
export default function MyPage() {
  return <div>My new page</div>
}
```

2. Add a route in `chess-client/src/App.tsx`:
```tsx
import MyPage from './pages/MyPage'
// ...
<Route path="/my-page" element={<MyPage />} />
```

3. Link to it somewhere (e.g. in `Home.tsx`):
```tsx
<Link to="/my-page">Go to My Page</Link>
```

---

### How to Change a Color

Open `chess-client/src/index.css`. Find the CSS variables section:
```css
:root {
  --accent: #your-new-color;
  --bg: #your-new-bg;
}
```

Change the hex value. It updates everywhere automatically.

---

### How to Add a Button That Does Something

```tsx
// In any page file
function MyPage() {
  const [message, setMessage] = useState('')

  const handleClick = () => {
    setMessage('Button was clicked!')
  }

  return (
    <div>
      <button onClick={handleClick}>Click me</button>
      {message && <p>{message}</p>}
    </div>
  )
}
```

---

### How to Add a New API Call (HTTP Request to Server)

1. In `chess-client/src/api/auth.ts` (or a new file like `games.ts`), add a function:
```ts
import { apiRequest } from './client'

export async function getMyGames() {
  return apiRequest('/games/my', { method: 'GET' })
}
```

2. Use it in a component:
```tsx
useEffect(() => {
  getMyGames().then(data => setGames(data))
}, [])
```

---

### How to Read a Value from the Auth Store

```tsx
import { useAuthStore } from '../stores/authStore'

function SomePage() {
  const user = useAuthStore((s) => s.user)
  const accessToken = useAuthStore((s) => s.accessToken)

  return <div>Hello {user?.username}</div>
}
```

The `?.` is "optional chaining" — it means "if user exists, get username; otherwise return undefined safely".

---

## Part 7 — Tools and Workflow

### The error overlay
When the app has a TypeScript or build error, Vite shows a red overlay in the browser. The error will tell you the file and line number. Click the X to dismiss it, fix the code, save, and Vite hot-reloads automatically.

### Browser DevTools (F12)
- **Console** — see errors and `console.log()` output. Start here when debugging.
- **Network tab** — see all HTTP requests. Click one to see the request body and response. Useful for debugging API calls.
- **Application → Local Storage** — you can see and delete the `chess-auth` key (your login state).

### VSCode
- Hover over any variable or function to see its type
- Cmd/Ctrl+click a function to jump to its definition
- The red squiggly underline = TypeScript error
- The yellow squiggly underline = ESLint warning (style issue, not necessarily broken)

---

## Summary: What to Learn and in What Order

1. **JavaScript basics first**: arrow functions, destructuring, spread `...`, `async/await`, imports/exports. 30–60 minutes on any JS tutorial.

2. **React core**: `useState`, JSX, props, `useEffect`, conditional rendering, `.map()` for lists. The official React docs (react.dev) have excellent interactive examples — just do the "Quick Start" section.

3. **TypeScript lightly**: read types as documentation, not as something to master. Understand union types, interfaces, and optional `?` properties. You can write plain JavaScript patterns and let TypeScript infer types.

4. **Zustand**: just the two patterns above (reading state, calling actions). That is the whole API for this app.

5. **React Router**: just `<Link>`, `useNavigate`, and `<Route>`. The rest you do not need yet.

**The fastest way to get comfortable:** open a file you want to change, read it top to bottom, and look up anything you do not recognize. Most things will become clear from context after a few files.
