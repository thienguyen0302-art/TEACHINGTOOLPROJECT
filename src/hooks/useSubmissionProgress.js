import { useCallback, useSyncExternalStore } from 'react';
import { auth } from '../services/firebase';
import { submissionProgressStore } from '../services/submissionProgressService';

export default function useSubmissionProgress(metadata) {
  const uid = auth.currentUser?.uid;
  const { slug, language } = metadata;
  const getSnapshot = useCallback(() => submissionProgressStore.get({ slug, language }, uid), [slug, language, uid]);
  const entry = useSyncExternalStore(submissionProgressStore.subscribe, getSnapshot, () => null);
  return { entry, record: (judge) => submissionProgressStore.record(metadata, judge, { uid }) };
}
