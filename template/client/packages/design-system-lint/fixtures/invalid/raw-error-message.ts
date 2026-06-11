export function errorText(caught: unknown) {
  try {
    throw caught
  } catch (error) {
    return error.message
  }
}
