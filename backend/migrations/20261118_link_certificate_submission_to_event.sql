-- Hubungkan pengajuan template sertifikat dengan acara.
-- Jalankan sekali pada database INFORHUB sebelum restart backend.
ALTER TABLE certificate_template_submissions
  ADD COLUMN event_id INT NULL AFTER organizer_id;

CREATE INDEX submissions_event_idx
  ON certificate_template_submissions (event_id);

ALTER TABLE certificate_template_submissions
  ADD CONSTRAINT fk_certificate_template_submissions_event
  FOREIGN KEY (event_id) REFERENCES events(id)
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Catatan: pengajuan lama akan memiliki event_id = NULL.
-- Hubungkan pengajuan lama yang sudah disetujui melalui endpoint:
-- POST /api/organizer/certificate-template-submissions/:id/activate
-- Body: { "eventId": ID_ACARA }
