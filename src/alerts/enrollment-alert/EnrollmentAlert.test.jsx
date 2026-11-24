import React from 'react';
import { getConfig } from '@edx/frontend-platform';
import { getAuthenticatedHttpClient } from '@edx/frontend-platform/auth';
import { logError } from '@edx/frontend-platform/logging';
import MockAdapter from 'axios-mock-adapter';

import {
  fireEvent, initializeTestStore, render, screen, waitFor,
} from '../../setupTest';
import EnrollmentAlert from './EnrollmentAlert';

jest.mock('@edx/frontend-platform/analytics');
jest.mock('@edx/frontend-platform/logging', () => ({
  ...jest.requireActual('@edx/frontend-platform/logging'),
  logError: jest.fn(),
}));

describe('EnrollmentAlert', () => {
  let axiosMock;
  let courseId;
  let enrollmentUrl;
  const { location } = window;

  beforeAll(async () => {
    const store = await initializeTestStore({ excludeFetchSequence: true });
    [courseId] = Object.keys(store.getState().models.courseHomeMeta);
    enrollmentUrl = `${getConfig().LMS_BASE_URL}/api/enrollment/v1/enrollment`;
  });

  beforeEach(() => {
    axiosMock = new MockAdapter(getAuthenticatedHttpClient());
    delete window.location;
    window.location = { reload: jest.fn() };
    logError.mockClear();
  });

  afterEach(() => {
    window.location = location;
  });

  function renderAlert() {
    render(<EnrollmentAlert payload={{ canEnroll: true, courseId, isStaff: false }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Enroll now.' }));
  }

  it('reloads the page when the enrollment succeeds', async () => {
    axiosMock.onPost(enrollmentUrl).reply(200, {});
    renderAlert();

    await waitFor(() => expect(window.location.reload).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('enrollment-error-message')).not.toBeInTheDocument();
  });

  it('shows the reason returned by the server when the enrollment is refused', async () => {
    const reason = 'You must link your partner account before enrolling in this course.';
    axiosMock.onPost(enrollmentUrl).reply(403, { message: reason, localizedMessage: reason });
    renderAlert();

    expect(await screen.findByTestId('enrollment-error-message')).toHaveTextContent(reason);
    expect(screen.getByRole('button', { name: 'Enroll now.' })).toBeEnabled();
    expect(window.location.reload).not.toHaveBeenCalled();
    expect(logError).not.toHaveBeenCalled();
  });

  it('shows a generic message and logs the error when the server gives no reason', async () => {
    axiosMock.onPost(enrollmentUrl).reply(500, {});
    renderAlert();

    expect(await screen.findByTestId('enrollment-error-message')).toHaveTextContent(
      'We could not enroll you in this course. Please try again later or contact support.',
    );
    expect(screen.getByRole('button', { name: 'Enroll now.' })).toBeEnabled();
    expect(window.location.reload).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalledTimes(1);
  });
});
