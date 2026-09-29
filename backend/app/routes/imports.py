import io
import zipfile

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.orm import Session

from ..db import session
from ..services import parse_fit

router = APIRouter(prefix='/api')
MAX_FIT_BYTES = 30_000_000


@router.post('/import')
async def import_files(files: list[UploadFile] = File(...), db: Session = Depends(session)):
    report = []
    for file in files:
        raw = await file.read()
        entries = []
        try:
            if file.filename.lower().endswith('.zip'):
                with zipfile.ZipFile(io.BytesIO(raw)) as archive:
                    for item in archive.infolist():
                        if item.filename.lower().endswith('.fit') and not item.is_dir():
                            if item.file_size <= MAX_FIT_BYTES:
                                entries.append((item.filename, archive.read(item)))
            elif file.filename.lower().endswith('.fit'):
                entries = [(file.filename, raw)]
            else:
                report.append({'file': file.filename, 'status': 'ignoré', 'reason': 'Format FIT ou ZIP attendu'})
                continue
            for name, data in entries:
                try:
                    result = parse_fit(data, db)
                    db.commit()
                    report.append({'file': name, **result})
                except Exception as error:
                    db.rollback()
                    report.append({'file': name, 'status': 'erreur', 'reason': str(error)})
        except Exception as error:
            report.append({'file': file.filename, 'status': 'erreur', 'reason': str(error)})
    return {'files': report}
