import { Route, Routes } from "react-router"
import { HelloPageRoute } from "./pages/hello/hello-page-route"

export function App() {
  return (
    <Routes>
      <Route element={<HelloPageRoute />} path="/" />
    </Routes>
  )
}
