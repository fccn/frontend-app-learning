import { useContext, useState, useCallback } from 'react';
import { sendTrackEvent } from '@edx/frontend-platform/analytics';
import { logError } from '@edx/frontend-platform/logging';

import { UserMessagesContext, ALERT_TYPES } from '../../generic/user-messages';

import { postCourseEnrollment } from './data/api';

// Separated into its own file to avoid a circular dependency inside this directory

// The enrollment API returns the reason of a refusal (e.g. an enrollment filter that
// prevented it) in `localizedMessage`, already translated to the learner's language.
function getEnrollmentErrorMessage(error) {
  const message = error?.response?.data?.localizedMessage;
  return typeof message === 'string' && message.trim() ? message.trim() : null;
}

function useEnrollClickHandler(courseId, orgId, successText, errorText) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const { addFlash } = useContext(UserMessagesContext);
  const enrollClickHandler = useCallback(() => {
    setLoading(true);
    setErrorMessage(null);
    postCourseEnrollment(courseId).then(() => {
      addFlash({
        dismissible: true,
        flash: true,
        text: successText,
        type: ALERT_TYPES.SUCCESS,
        topic: 'course',
      });
      setLoading(false);
      sendTrackEvent('edx.bi.user.course-home.enrollment', {
        org_key: orgId,
        courserun_key: courseId,
      });
      global.location.reload();
    }).catch((error) => {
      const serverMessage = getEnrollmentErrorMessage(error);
      if (!serverMessage) {
        logError(error);
      }
      setErrorMessage(serverMessage || errorText);
      setLoading(false);
    });
  }, [addFlash, courseId, orgId, successText, errorText]);

  return { enrollClickHandler, loading, errorMessage };
}

export default useEnrollClickHandler;
