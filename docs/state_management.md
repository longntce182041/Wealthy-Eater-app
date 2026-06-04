# State Management Specifications

## 1. Frontend Mobile (Flutter)
The mobile app uses the **Provider** package for state management and dependency injection, organized at the root widget tree.

### Core Providers
- **`AuthProvider`**:
  - **State**: Tracks `AuthState` (`initial`, `loading`, `authenticated`, `unauthenticated`, `error`), the current authenticated user (`UserEntity?`), and `errorMessage`.
  - **Persistence**: Employs `FlutterSecureStorage` to store and retrieve the JWT `accessToken`.
  - **Key Operations**:
    - `restoreSession()`: Initiates on app startup, checks secure storage for `'accessToken'`, verifies it against the `/api/auth/me` endpoint.
    - `login(email, password)`: Sends credentials to `/api/auth/login`, saves the token, and sets state to `authenticated`.
    - `googleSignIn()`: Triggers Google SSO via `google_sign_in` package, posts the retrieved `idToken` to `/api/auth/google`, saves the session.
    - `logout()`: Clears credentials and tokens from memory and secure storage.
- **`RecipeProvider`**:
  - **State**: Holds recipe lists and single recipe details.
  - **Business Logic**: Dispatched through Dart use cases:
    - `GetRecipesUseCase`
    - `GetRecipeDetailUseCase`
  - **Operations**: `loadRecipes()` triggers on successful auth to populate UI.

### Networking
- **`ApiClient`**: Extends and wraps the `dio` network client for all standard HTTP communications, supporting configurable base URLs based on host environments (e.g. localhost, Android Emulator 10.0.2.2).

---

## 2. Frontend Web Admin (React)
The web administration client is built as a single-page app using React Router DOM, relying on localized state hook structures rather than a heavy global store.

### State & Storage
- **Component State**: Uses standard React `useState` hooks for input fields, error handling, and loading feedback.
- **Session Persistence**: Holds state directly inside the browser's `localStorage`:
  - `admin_session_jwt_token`: Saved authentication JSON Web Token.
  - `admin_user`: Stringified JSON representation of the logged-in admin.
- **Route Guarding**: Wrapped inside a `RequireAdmin` layout component. It parses `localStorage` data and redirects to `/login` if credentials are missing or the user's role is not `'admin'`.

### Network Interceptors
- **`apiClient`**: An `axios` instance pointing to `VITE_API_GATEWAY_URL` with a standard 10-second request timeout.
- **Interceptor**: Automatically intercepts outgoing requests and appends the Bearer token:
  ```javascript
  config.headers["Authorization"] = `Bearer ${adminToken}`;
  ```
