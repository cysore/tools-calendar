# Integration and E2E Tests

This directory contains comprehensive integration and end-to-end tests for the team calendar sync application.

## Test Structure

### Integration Tests

Integration tests focus on testing the interaction between multiple components and services:

1. **Authentication Flow Tests** (`auth-flow.test.tsx`)
   - User registration process
   - Login and logout functionality
   - Password reset flow
   - Authentication state management
   - Form validation and error handling

2. **Team Management Flow Tests** (`team-management-flow.test.tsx`)
   - Team creation and selection
   - Member invitation and management
   - Role-based permissions
   - Team settings and configuration

3. **Event Management Flow Tests** (`event-management-flow.test.tsx`)
   - Event creation and editing
   - Calendar view interactions
   - Event filtering and search
   - Permission validation

### E2E Tests

End-to-end tests simulate real user interactions using Playwright:

1. **Authentication E2E** (`auth-flow.spec.ts`)
   - Complete user registration workflow
   - Login/logout scenarios
   - Password reset functionality
   - Session management
   - Accessibility testing

2. **Team Management E2E** (`team-management.spec.ts`)
   - Team creation and switching
   - Member management workflows
   - Team settings configuration
   - Mobile responsiveness

3. **Calendar and Events E2E** (`calendar-and-events.spec.ts`)
   - Calendar view navigation
   - Event creation and management
   - Filtering and search functionality
   - Performance testing

4. **Subscription Features E2E** (`subscription-features.spec.ts`)
   - iCalendar subscription management
   - Event export functionality
   - Cross-platform compatibility
   - Security validation

## Test Helpers

The `test-helpers.ts` file provides utilities for:

- Mock data generation
- API response mocking
- Form interaction helpers
- Performance measurement
- Accessibility checking

## Running Tests

### Integration Tests

```bash
npm test -- --testPathPattern="integration"
```

### E2E Tests

```bash
npm run test:e2e
```

### Specific Test Files

```bash
# Run specific integration test
npm test -- src/__tests__/integration/auth-flow.test.tsx

# Run specific E2E test
npm run test:e2e -- tests/e2e/auth-flow.spec.ts
```

## Test Coverage

The tests cover the following user flows:

### Authentication Flows

- ✅ User registration with validation
- ✅ Login with credentials
- ✅ Password reset process
- ✅ Session management
- ✅ Authentication state handling

### Team Management Flows

- ✅ Team creation and configuration
- ✅ Member invitation and role management
- ✅ Team switching and context
- ✅ Permission enforcement

### Event Management Flows

- ✅ Event creation and editing
- ✅ Calendar view interactions
- ✅ Event filtering and search
- ✅ Drag and drop functionality

### Subscription Flows

- ✅ iCalendar subscription setup
- ✅ Event export functionality
- ✅ Subscription security
- ✅ Cross-platform compatibility

## Test Configuration

### Jest Configuration

- Uses `@testing-library/react` for component testing
- Mocks NextAuth and other external dependencies
- Provides custom render function with providers

### Playwright Configuration

- Tests against multiple browsers (Chrome, Firefox, Safari)
- Mobile device testing
- Automatic screenshot on failure
- Performance monitoring

## Best Practices

1. **Test Isolation**: Each test is independent and can run in any order
2. **Mock Management**: External dependencies are properly mocked
3. **User-Centric**: Tests focus on user interactions rather than implementation details
4. **Accessibility**: Tests include accessibility checks
5. **Performance**: Tests monitor performance metrics
6. **Error Handling**: Tests cover error scenarios and edge cases

## Troubleshooting

### Common Issues

1. **NextAuth Secret Error**: Ensure `NEXTAUTH_SECRET` is set in test environment
2. **Component Not Found**: Check that components are properly exported and imported
3. **API Mock Issues**: Verify mock responses match expected API format
4. **Timeout Issues**: Increase timeout for slow operations or network requests

### Debug Tips

1. Use `screen.debug()` to see rendered HTML in integration tests
2. Use `page.screenshot()` to capture E2E test state
3. Check browser console for JavaScript errors
4. Verify network requests in browser dev tools

## Future Enhancements

1. **Visual Regression Testing**: Add screenshot comparison tests
2. **Performance Benchmarks**: Set performance thresholds
3. **Cross-Browser Testing**: Expand browser coverage
4. **API Contract Testing**: Add contract testing with backend
5. **Load Testing**: Test application under load
