export type AttendanceEndDisplay = {
  label: 'Ongoing' | 'Superseded';
  className: 'text-primary' | 'text-amber-600';
};

type OpenEndedRecord = {
  startTime: string;
  endTime?: string | null;
  isSuperseded?: boolean;
};

function getComparableTimestamp(value: string): number {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function buildAttendanceEndDisplay<T extends OpenEndedRecord>(
  records: T[],
  index: number,
  hasMoreRecentRecordInScope: (record: T, index: number) => boolean,
): AttendanceEndDisplay | null {
  const record = records[index];

  if (!record || record.endTime) {
    return null;
  }

  // Use the DB flag when available — it reflects creation-time intent (primary vs audit row).
  // The timestamp heuristic is unreliable: an audit row (isSuperseded=true) always has a newer
  // startTime than the primary session it duplicated, so heuristic and DB flag give opposite results.
  if (record.isSuperseded !== undefined) {
    return record.isSuperseded
      ? { label: 'Superseded', className: 'text-amber-600' }
      : { label: 'Ongoing', className: 'text-primary' };
  }

  const hasMoreRecentRecord = hasMoreRecentRecordInScope(record, index);

  return hasMoreRecentRecord
    ? { label: 'Superseded', className: 'text-amber-600' }
    : { label: 'Ongoing', className: 'text-primary' };
}

export function getSingleStaffAttendanceEndDisplay<T extends OpenEndedRecord>(
  records: T[],
  index: number,
): AttendanceEndDisplay | null {
  return buildAttendanceEndDisplay(records, index, (record, currentIndex) => {
    const currentTimestamp = getComparableTimestamp(record.startTime);

    return records.some((candidate, candidateIndex) => {
      if (candidateIndex === currentIndex) {
        return false;
      }

      const candidateTimestamp = getComparableTimestamp(candidate.startTime);

      return candidateTimestamp > currentTimestamp
        || (candidateTimestamp === currentTimestamp && candidateIndex < currentIndex);
    });
  });
}

export function getMultiStaffAttendanceEndDisplay<T extends OpenEndedRecord>(
  records: T[],
  index: number,
  getStaffKey: (record: T) => string,
): AttendanceEndDisplay | null {
  return buildAttendanceEndDisplay(records, index, (record, currentIndex) => {
    const staffKey = getStaffKey(record);
    const currentTimestamp = getComparableTimestamp(record.startTime);

    return records.some((candidate, candidateIndex) => {
      if (candidateIndex === currentIndex || getStaffKey(candidate) !== staffKey) {
        return false;
      }

      const candidateTimestamp = getComparableTimestamp(candidate.startTime);

      return candidateTimestamp > currentTimestamp
        || (candidateTimestamp === currentTimestamp && candidateIndex < currentIndex);
    });
  });
}