from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
import models
from database import SessionLocal
from models import Syllabus, PreferenceConstraint, SubjectPreference, ProgramTypeEnum, SemesterTypeEnum, Faculty, Cohort, CohortSyllabusMapping

from routers.auth import get_current_user, verify_admin_role, verify_faculty_role

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class PreferenceRequest(BaseModel):
    faculty_id: int
    preferred_day: str
    preferred_period: int
    preference_type: str 

@router.post("/api/faculty/preferences")
def submit_preferences(prefs: List[PreferenceRequest], db: Session = Depends(get_db), current_user: models.User = Depends(verify_faculty_role)):
    try:
        if not prefs:
            return {"message": "No preferences submitted"}
            
        fac_id = prefs[0].faculty_id
        db.query(models.FacultyPreference).filter(models.FacultyPreference.faculty_id == fac_id).delete()
        
        pref_records = []
        for p in prefs:
            pref_records.append(models.FacultyPreference(
                faculty_id=p.faculty_id,
                preferred_day=p.preferred_day,
                preferred_period=p.preferred_period,
                preference_type=models.PreferenceTypeEnum(p.preference_type)
            ))
            
        db.add_all(pref_records)
        db.commit()
        return {"message": f"Successfully saved {len(pref_records)} preferences"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/admin/preferences")
def get_all_preferences(
    program_type: str = "UG", 
    semester_type: str = "ODD", 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(verify_admin_role)
):
    try:
        prog = ProgramTypeEnum(program_type.upper())
        sem = SemesterTypeEnum(semester_type.upper())
        
        # 1. Fetch SubjectPreferences via outerjoin to prevent null crashes
        preferences = db.query(models.SubjectPreference, models.Faculty, models.Syllabus).outerjoin(
            models.Faculty, models.SubjectPreference.faculty_id == models.Faculty.id
        ).outerjoin(
            models.Syllabus, models.SubjectPreference.subject_code == models.Syllabus.subject_code
        ).filter(
            models.Syllabus.program_type == prog,
            models.Syllabus.semester_type == sem
        ).all()
        
        # Calculate conflicts (subject requested by multiple faculty)
        subject_counts = {}
        for pref, fac, syl in preferences:
            if syl:
                subject_counts[syl.subject_code] = subject_counts.get(syl.subject_code, 0) + 1
            
        # Fetch Cohort mappings
        cohort_mappings = db.query(models.CohortSyllabusMapping, models.Cohort).join(
            models.Cohort, models.CohortSyllabusMapping.cohort_id == models.Cohort.id
        ).filter(
            models.Cohort.program_type == prog,
            models.Cohort.semester_type == sem
        ).all()
        
        mapping_dict = {}
        for cmap, cohort in cohort_mappings:
            if cmap.subject_code not in mapping_dict:
                mapping_dict[cmap.subject_code] = []
            mapping_dict[cmap.subject_code].append(cohort)
            
        result = []
        for pref, fac, syl in preferences:
            if not syl or not fac:
                continue
                
            cohorts = mapping_dict.get(syl.subject_code, [])
            has_conflict = subject_counts.get(syl.subject_code, 0) > 1
            
            if not cohorts:
                result.append({
                    "id": f"{fac.id}-{syl.subject_code}-unassigned",
                    "faculty_id": fac.id,
                    "faculty_name": fac.name,
                    "subject_code": syl.subject_code,
                    "cohort_id": "",
                    "cohort_name": "Unassigned",
                    "role_type": "Main",
                    "allocated_theory_hours": 0,
                    "allocated_lab_hours": 0,
                    "max_theory": syl.theory_hours_l or 0,
                    "max_lab": syl.practical_hours_p or 0,
                    "has_conflict": has_conflict,
                    "status": pref.status
                })
            else:
                for c in cohorts:
                    result.append({
                        "id": f"{fac.id}-{syl.subject_code}-{c.id}",
                        "faculty_id": fac.id,
                        "faculty_name": fac.name,
                        "subject_code": syl.subject_code,
                        "cohort_id": c.id,
                        "cohort_name": f"{c.class_name} - {c.section}",
                        "role_type": "Main",
                        "allocated_theory_hours": 0,
                        "allocated_lab_hours": 0,
                        "max_theory": syl.theory_hours_l or 0,
                        "max_lab": syl.practical_hours_p or 0,
                        "has_conflict": has_conflict,
                        "status": pref.status
                    })
                    
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/api/faculty/form-data")
def get_faculty_form_data(
    program_type: str, 
    semester_type: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(verify_faculty_role)
):
    prog = ProgramTypeEnum(program_type.upper())
    sem = SemesterTypeEnum(semester_type.upper())
    
    faculty_rec = db.query(models.Faculty).filter_by(user_id=current_user.id).first()
    
    syllabus_records = db.query(models.Syllabus).filter_by(
        program_type=prog, 
        semester_type=sem,
        is_active=True
    ).all()
    
    if not syllabus_records:
        faculty_dept = getattr(faculty_rec, "department", None) if faculty_rec else None
        return {"faculty_department": faculty_dept, "subjects": [], "constraints": []}
        
    faculty_dept = getattr(faculty_rec, "department", None) if faculty_rec else None
    return {
        "faculty_department": faculty_dept,
        "subjects": [
            {
                "subject_code": s.subject_code,
                "course_title": s.course_title,
                "subject_category": s.subject_category,
                "theory_hours_l": s.theory_hours_l,
                "practical_hours_p": s.practical_hours_p,
                "credits_c": s.credits_c
            } for s in syllabus_records
        ]
    }

class CartSubmissionRequest(BaseModel):
    program_type: str
    semester_type: str
    subject_codes: List[str]

@router.post("/api/faculty/submit-cart")
def submit_faculty_cart(
    payload: CartSubmissionRequest,
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(verify_faculty_role)
):
    try:
        # Enforce 10-subject maximum cap boundary
        if len(payload.subject_codes) > 10:
            raise HTTPException(status_code=400, detail="Maximum limit of 10 subjects exceeded.")
            
        prog = ProgramTypeEnum(payload.program_type.upper())
        sem = SemesterTypeEnum(payload.semester_type.upper())
        faculty_rec = db.query(models.Faculty).filter_by(user_id=current_user.id).first()
        
        if not faculty_rec:
            raise HTTPException(status_code=400, detail="Faculty profile not found for user.")
            
        faculty_id = faculty_rec.id
        
        if not payload.subject_codes:
            raise HTTPException(status_code=400, detail="Cart is empty.")
            
        with db.begin_nested():
            # Group submitted subjects by category
            subjects = db.query(models.Syllabus).filter(models.Syllabus.subject_code.in_(payload.subject_codes)).all()
            if len(subjects) != len(payload.subject_codes):
                raise HTTPException(status_code=400, detail="One or more subject codes are invalid.")
                
            category_counts = {}
            for s in subjects:
                cat = s.subject_category or "Uncategorized"
                category_counts[cat] = category_counts.get(cat, 0) + 1
                
            constraints = db.query(models.PreferenceConstraint).filter_by(
                program_type=prog, 
                semester_type=sem
            ).all()
            
            constraint_dict = {c.subject_category: c.max_allowed for c in constraints}
            
            for cat, count in category_counts.items():
                max_allowed = constraint_dict.get(cat)
                if max_allowed is not None and count > max_allowed:
                    raise HTTPException(
                        status_code=400, 
                        detail=f"Maximum allowed '{cat}' subjects exceeded. Allowed: {max_allowed}, Submitted: {count}."
                    )
            
            # Clear current subject preferences for this faculty.
            db.query(models.SubjectPreference).filter_by(faculty_id=faculty_id).delete()
            
            # Insert new ones
            for sc in payload.subject_codes:
                pref = models.SubjectPreference(
                    faculty_id=faculty_id,
                    subject_code=sc,
                    status='PENDING'
                )
                db.add(pref)
                
        db.commit()
        return {"message": "Cart submitted successfully and is pending approval."}
        
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))
