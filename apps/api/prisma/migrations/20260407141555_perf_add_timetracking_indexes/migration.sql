-- Performance: add indexes to TimeTracking for frequent query patterns

-- closeOpenRecord: WHERE staffId = ? AND endTime IS NULL AND isDeleted = false ORDER BY startTime DESC
CREATE INDEX "TimeTracking_staffId_endTime_isDeleted_idx" ON "TimeTracking"("StaffId", "EndTime", "IsDeleted");

-- getTodayAttendance / getHistory: WHERE staffId = ? ORDER BY startTime DESC
CREATE INDEX "TimeTracking_staffId_startTime_idx" ON "TimeTracking"("StaffId", "StartTime" DESC);

-- autoLogout cron: WHERE endTime IS NULL AND isDeleted = false
CREATE INDEX "TimeTracking_endTime_isDeleted_idx" ON "TimeTracking"("EndTime", "IsDeleted");
