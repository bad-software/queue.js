import o from 'ospec'


/**
 * Assert that an async function throws an error.
 * @param {Function} callback The async function.
 * @param {string} errorMessage The expected error message.
 * @returns {Promise<void>} A promise that resolves when the assertion is
 * complete.
 */
export async function asyncThrows( callback, errorMessage ) {
  let _errorMessage

  try {
    await callback()
  } catch ( e ) {
    _errorMessage = e.message
  } finally {
    o( _errorMessage ).equals( errorMessage )
  }
}
