/**
 * CET & CAP Course Profiles Knowledge Base
 * 
 * Provides verified official rules, eligibility percentages, exam patterns,
 * fee structures, and document checklists for every course conducted by
 * Maharashtra State Common Entrance Test Cell (Higher, Technical, Agriculture, Fine Art, Medical).
 */

export interface CourseProfile {
  key: string;
  name: string;
  marathiName: string;
  category: 'Higher' | 'Technical' | 'Agriculture' | 'Fine Art' | 'Medical';
  level: 'UG' | 'PG' | 'Integrated' | 'Other';
  eligibility: {
    en: {
      summary: string;
      items: string[];
    };
    mr: {
      summary: string;
      items: string[];
    };
  };
  examPattern: {
    en: {
      summary: string;
      items: string[];
    };
    mr: {
      summary: string;
      items: string[];
    };
  };
  fees: {
    en: {
      summary: string;
      items: string[];
    };
    mr: {
      summary: string;
      items: string[];
    };
  };
  documents: {
    en: {
      summary: string;
      mandatory: string[];
      category: string[];
      notes: string[];
    };
    mr: {
      summary: string;
      mandatory: string[];
      category: string[];
      notes: string[];
    };
  };
}

export const CET_COURSE_PROFILES: Record<string, CourseProfile> = {
  // 1. MHT-CET (ENGINEERING - B.E. / B.TECH)
  'mht-cet-eng': {
    key: 'mht-cet-eng',
    name: 'MHT-CET (Engineering / B.E. / B.Tech)',
    marathiName: 'MHT-CET (अभियांत्रिकी व तंत्रज्ञान — B.E. / B.Tech)',
    category: 'Technical',
    level: 'UG',
    eligibility: {
      en: {
        summary: 'Candidate must have passed HSC (12th Science) examination with Physics and Mathematics as compulsory subjects:',
        items: [
          'Passed HSC (Std. XII) with Physics and Mathematics along with Chemistry / Biotechnology / Biology / Technical Vocational subjects.',
          'General / Open Category Candidates: Minimum 45% marks in PCM subjects aggregate.',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC), EWS & PwD (Maharashtra State): Minimum 40% marks in PCM aggregate.',
          'Candidate must obtain a non-zero score in MHT-CET 2026 (PCM group) or JEE Main Paper-1.',
        ],
      },
      mr: {
        summary: 'उमेदवाराने १२ वी विज्ञान (HSC Science) परीक्षा भौतिकशास्त्र व गणित विषयासह उत्तीर्ण केलेली असणे आवश्यक:',
        items: [
          '१२ वी (HSC) परीक्षेत भौतिकशास्त्र (Physics) आणि गणित (Mathematics) हे अनिवार्य विषय, सोबत रसायनशास्त्र / जीवशास्त्र / व्होकेशनल विषय असणे आवश्यक.',
          'खुला प्रवर्ग (Open / General): PCM गटात एकत्रित किमान ४५% गुण आवश्यक.',
          'राखीव प्रवर्ग (SC, ST, VJ/NT, OBC, SBC), EWS व दिव्यांग (महाराष्ट्र राज्य): PCM गटात एकत्रित किमान ४०% गुण आवश्यक.',
          'MHT-CET २०२६ (PCM गट) परीक्षेत नॉन-झिरो गुण मिळवणे बंधनकारक.',
        ],
      },
    },
    examPattern: {
      en: {
        summary: 'MHT-CET Engineering is conducted in Computer Based Test (CBT) online mode for 200 marks:',
        items: [
          'Paper 1 (Mathematics): 100 Marks (50 questions, 2 marks per question, 90 minutes).',
          'Paper 2 (Physics & Chemistry): 100 Marks (50 Physics + 50 Chemistry questions, 1 mark each, 90 minutes).',
          'Total Duration: 180 Minutes (90 mins Paper 1 + 90 mins Paper 2). Total Marks: 200.',
          'NO Negative Marking: No marks are deducted for incorrect answers.',
        ],
      },
      mr: {
        summary: 'MHT-CET अभियांत्रिकी परीक्षा संगणक आधारित (CBT) पद्धतीने २०० गुणांसाठी घेतली जाते:',
        items: [
          'पेपर १ (गणित): १०० गुण (५० प्रश्न, प्रत्येक प्रश्नास २ गुण, कालावधी ९० मिनिटे).',
          'पेपर २ (भौतिकशास्त्र व रसायनशास्त्र): १०० गुण (५० भौतिकशास्त्र + ५० रसायनशास्त्र, प्रत्येकी १ गुण, ९० मिनिटे).',
          'एकूण कालावधी: १८० मिनिटे (३ तास). एकूण गुण: २०० गुण.',
          'नकारात्मक गुणांकन (Negative Marking): कोणतीही नकारात्मक गुणांकन पद्धत नाही.',
        ],
      },
    },
    fees: {
      en: {
        summary: 'MHT-CET 2026 Application and Examination Fee Structure:',
        items: [
          'General / Open Category Candidates & Outside Maharashtra State (OMS): ₹ 1,000/-',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC, EWS) & PwD (Maharashtra State): ₹ 800/-',
        ],
      },
      mr: {
        summary: 'MHT-CET २०२६ अधिकृत परीक्षा शुल्क रचना:',
        items: [
          'खुला प्रवर्ग (Open Category) व महाराष्ट्राबाहेरील (OMS) उमेदवार: ₹ १,०००/-',
          'मागासवर्गीय प्रवर्ग (SC, ST, VJ/NT, OBC, SBC, EWS) व दिव्यांग (महाराष्ट्र राज्य): ₹ ८००/-',
        ],
      },
    },
    documents: {
      en: {
        summary: 'Mandatory documents required for MHT-CET Engineering CAP Registration & Scrutiny:',
        mandatory: [
          '1. SSC (10th) Marksheet & Board Passing Certificate',
          '2. HSC (12th) Marksheet & Board Passing Certificate',
          '3. MHT-CET 2026 Official Score Card & Admit Card',
          '4. Maharashtra State Domicile Certificate / Birth Certificate / School Leaving Certificate (Type-A)',
        ],
        category: [
          '5. Caste Certificate (for SC, ST, VJ/NT, OBC, SBC categories)',
          '6. Caste Validity Certificate (MANDATORY for SC, ST, VJ/NT, OBC, SBC from Divisional Scrutiny Committee)',
          '7. Non-Creamy Layer (NCL) Certificate valid up to 31st March 2027 (mandatory for VJ/NT, OBC, SBC)',
          '8. EWS Eligibility Certificate issued by Tahsildar for current financial year (if applicable)',
          '9. Income Certificate issued by Tahsildar (mandatory for TFWS - Tuition Fee Waiver Scheme claims)',
        ],
        notes: [
          'Caste Validity and NCL must be uploaded during CAP registration. Without Caste Validity, candidate is automatically treated as OPEN.',
          'Keep original documents ready for physical scrutiny or upload clear original color scans for E-Scrutiny.',
        ],
      },
      mr: {
        summary: 'MHT-CET अभियांत्रिकी CAP नोंदणी व स्क्रूटिनीसाठी आवश्यक अधिकृत कागदपत्रे:',
        mandatory: [
          '१. SSC (१० वी) गुणपत्रिका व बोर्ड उत्तीर्ण प्रमाणपत्र',
          '२. HSC (१२ वी) गुणपत्रिका व बोर्ड उत्तीर्ण प्रमाणपत्र',
          '३. अधिकृत MHT-CET २०२६ Score Card व हॉल तिकीट (Admit Card)',
          '४. महाराष्ट्र अधिवास प्रमाणपत्र (Domicile Certificate) किंवा जन्माचा दाखला / शाळा सोडल्याचा दाखला (Type-A)',
        ],
        category: [
          '५. जात प्रमाणपत्र (Caste Certificate) — SC, ST, VJ/NT, OBC, SBC प्रवर्गांसाठी',
          '६. जात वैधता प्रमाणपत्र (Caste Validity Certificate) — विभागीय पडताळणी समितीचे प्रमाणपत्र अनिवार्य',
          '७. नॉन-क्रिमीलेअर (NCL) प्रमाणपत्र — ३१ मार्च २०२७ पर्यंत वैध असणे आवश्यक (VJ/NT, OBC, SBC साठी)',
          '८. EWS पात्रता प्रमाणपत्र — सक्षम महसूल अधिकाऱ्याने (तहसीलदार) चालू आर्थिक वर्षासाठी दिलेले',
          '९. उत्पन्न प्रमाणपत्र (Income Certificate) — TFWS (ट्युशन फी माफी योजना) साठी कुटुंबाचे वार्षिक उत्पन्न ८ लाखांपेक्षा कमी असणे आवश्यक',
        ],
        notes: [
          'जात वैधता किंवा नॉन-क्रिमीलेअर वेळेत सादर न केल्यास उमेदवाराचा विचार खुल्या प्रवर्गातून (Open) केला जातो.',
          'स्क्रूटिनीसाठी सर्व मूळ कागदपत्रांचे रंगीत स्कॅन किंवा प्रत्यक्ष तपासणीसाठी मूळ प्रती सोबत ठेवाव्यात.',
        ],
      },
    },
  },

  // 2. MHT-CET (PHARMACY - B.PHARM / PHARM.D)
  'mht-cet-pharm': {
    key: 'mht-cet-pharm',
    name: 'MHT-CET (Pharmacy / B.Pharm / Pharm.D)',
    marathiName: 'MHT-CET (फार्मसी — B.Pharm / Pharm.D)',
    category: 'Technical',
    level: 'UG',
    eligibility: {
      en: {
        summary: 'Candidate must have passed HSC (12th Science) examination with Physics and Chemistry as compulsory subjects:',
        items: [
          'Passed HSC (Std. XII) with Physics and Chemistry along with Mathematics or Biology.',
          'General / Open Category: Minimum 45% aggregate marks in PCM or PCB subjects.',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC), EWS & PwD (Maharashtra State): Minimum 40% aggregate marks.',
          'Candidate must obtain a non-zero score in MHT-CET 2026 (PCB or PCM group) or NEET UG.',
        ],
      },
      mr: {
        summary: 'उमेदवाराने १२ वी विज्ञान (HSC Science) परीक्षा भौतिकशास्त्र व रसायनशास्त्र विषयासह उत्तीर्ण केलेली असणे आवश्यक:',
        items: [
          '१२ वी परीक्षेत भौतिकशास्त्र व रसायनशास्त्र अनिवार्य, सोबत गणित किंवा जीवशास्त्र (Biology) विषय असणे आवश्यक.',
          'खुला प्रवर्ग (Open Category): PCB किंवा PCM गटात एकत्रित किमान ४५% गुण आवश्यक.',
          'राखीव प्रवर्ग (SC, ST, VJ/NT, OBC, SBC), EWS व दिव्यांग (महाराष्ट्र राज्य): एकत्रित किमान ४०% गुण आवश्यक.',
          'MHT-CET २०२६ (PCB किंवा PCM गट) किंवा NEET परीक्षेत नॉन-झिरो गुण असणे आवश्यक.',
        ],
      },
    },
    examPattern: {
      en: {
        summary: 'Pharmacy candidates can appear in either PCB or PCM group in MHT-CET:',
        items: [
          'PCB Group: Paper 2 (Physics & Chemistry, 100 marks) + Paper 3 (Biology, 100 questions, 100 marks) = Total 200 Marks.',
          'PCM Group: Paper 1 (Mathematics, 100 marks) + Paper 2 (Physics & Chemistry, 100 marks) = Total 200 Marks.',
          'Duration: 180 Minutes (90 mins per session). NO negative marking.',
        ],
      },
      mr: {
        summary: 'फार्मसी प्रवेशासाठी विद्यार्थी PCB किंवा PCM यापैकी कोणत्याही गटाची परीक्षा देऊ शकतात:',
        items: [
          'PCB गट: पेपर २ (भौतिकशास्त्र व रसायनशास्त्र, १०० गुण) + पेपर ३ (जीवशास्त्र, १०० गुण) = एकूण २०० गुण.',
          'PCM गट: पेपर १ (गणित, १०० गुण) + पेपर २ (भौतिकशास्त्र व रसायनशास्त्र, १०० गुण) = एकूण २०० गुण.',
          'कालावधी: १८० मिनिटे (प्रत्येक सत्रासाठी ९० मिनिटे). कोणतीही नकारात्मक गुणांकन पद्धत नाही.',
        ],
      },
    },
    fees: {
      en: {
        summary: 'MHT-CET Pharmacy Examination Fee:',
        items: [
          'Open Category / OMS: ₹ 1,000/-',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC, EWS) & PwD (Maharashtra): ₹ 800/-',
        ],
      },
      mr: {
        summary: 'MHT-CET फार्मसी परीक्षा शुल्क रचना:',
        items: [
          'खुला प्रवर्ग (Open) / OMS: ₹ १,०००/-',
          'राखीव प्रवर्ग (SC, ST, VJ/NT, OBC, SBC, EWS) व दिव्यांग: ₹ ८००/-',
        ],
      },
    },
    documents: {
      en: {
        summary: 'Required documents for Pharmacy CAP Verification:',
        mandatory: [
          '1. SSC (10th) Marksheet & Certificate',
          '2. HSC (12th) Marksheet (showing Physics, Chemistry, Biology/Maths)',
          '3. MHT-CET 2026 Score Card (PCB or PCM) or NEET Score Card',
          '4. Maharashtra State Domicile Certificate / Birth Certificate',
        ],
        category: [
          '5. Caste Certificate (SC, ST, VJ/NT, OBC, SBC)',
          '6. Caste Validity Certificate (mandatory)',
          '7. Non-Creamy Layer (NCL) valid up to 31st March 2027 (for VJ/NT, OBC, SBC)',
          '8. EWS Certificate for current financial year',
        ],
        notes: ['All original certificates must be produced during physical scrutiny or verified via E-Scrutiny.'],
      },
      mr: {
        summary: 'फार्मसी CAP पडताळणीसाठी आवश्यक कागदपत्रे:',
        mandatory: [
          '१. SSC (१० वी) गुणपत्रिका व प्रमाणपत्र',
          '२. HSC (१२ वी) गुणपत्रिका (PCB किंवा PCM विषयासह)',
          '३. अधिकृत MHT-CET २०२६ Score Card (PCB/PCM) किंवा NEET Score Card',
          '४. महाराष्ट्र अधिवास प्रमाणपत्र (Domicile) किंवा जन्माचा दाखला',
        ],
        category: [
          '५. जात प्रमाणपत्र (Caste Certificate)',
          '६. जात वैधता प्रमाणपत्र (Caste Validity Certificate — अनिवार्य)',
          '७. नॉन-क्रिमीलेअर (NCL) प्रमाणपत्र — ३१ मार्च २०२७ पर्यंत वैध',
          '८. EWS पात्रता प्रमाणपत्र (चालू आर्थिक वर्षाचे)',
        ],
        notes: ['जात वैधता प्रमाणपत्र नसल्यास खुल्या प्रवर्गातून (Open) जागा वाटप केले जाते.'],
      },
    },
  },

  // 3. AGRICULTURE & ALLIED COURSES (MCAER)
  'agri': {
    key: 'agri',
    name: 'Agriculture & Allied Courses (B.Sc. Agri, Horticulture, etc.)',
    marathiName: 'कृषी व संलग्न पदवी अभ्यासक्रम (B.Sc. Agri, Horticulture, MCAER)',
    category: 'Agriculture',
    level: 'UG',
    eligibility: {
      en: {
        summary: 'Eligibility for B.Sc. (Hons) Agriculture, Horticulture, Forestry, Food Technology, etc.:',
        items: [
          'Passed XII Std. (Science) with English, Physics, Chemistry, and Biology or Mathematics.',
          'General / Open Category Candidates: Minimum 50% marks in XII Science aggregate.',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC), EWS & PwD (Maharashtra State): Minimum 40% aggregate marks.',
          'Must have appeared and obtained a non-zero score in MHT-CET 2026 (PCB or PCM group) or NEET UG.',
        ],
      },
      mr: {
        summary: 'कृषी व संलग्न पदवी (B.Sc. Agriculture, Horticulture, Forestry) अभ्यासक्रमासाठी पात्रता अटी:',
        items: [
          'उमेदवाराने १२ वी विज्ञान (XII Science) परीक्षा इंग्रजी, भौतिकशास्त्र, रसायनशास्त्र आणि जीवशास्त्र किंवा गणित विषयासह उत्तीर्ण असणे आवश्यक.',
          'खुला प्रवर्ग (Open Category): १२ वी विज्ञान परीक्षेत एकत्रित किमान ५०% गुण आवश्यक.',
          'मागासवर्गीय प्रवर्ग (SC, ST, VJ/NT, OBC, SBC), EWS व दिव्यांग: १२ वी विज्ञान परीक्षेत एकत्रित किमान ४०% गुण आवश्यक.',
          'MHT-CET २०२६ (PCB किंवा PCM गट) किंवा NEET परीक्षेत नॉन-झिरो गुण असणे अनिवार्य.',
        ],
      },
    },
    examPattern: {
      en: {
        summary: 'Admission is based on MHT-CET (PCB / PCM) score + Special Additional Weightages:',
        items: [
          'Merit Score = MHT-CET percentile/marks + Applicable Weightage percentages (up to 20% total).',
          'Agriculturist Weightage (7/12 Extract): 12% additional weightage marks.',
          'Agricultural Vocational Course in Std. XII: 10% additional weightage marks.',
          'NCC / NSS Certificate: 2% additional weightage.',
          'Sports representation at State / National level: 2% to 4% additional weightage.',
        ],
      },
      mr: {
        summary: 'प्रवेश गुणवत्ता यादी MHT-CET गुण + विशेष अतिरिक्त वेटेज गुणांवरून तयार होते:',
        items: [
          'गुणवत्ता गुण = MHT-CET चे गुण + लागू असलेले अतिरिक्त वेटेज गुण (कमाल २०% पर्यंत).',
          'शेतकरी वेटेज (७/१२ उतारा व नमुना D): १२% अतिरिक्त गुण दिले जातात.',
          '१२ वी मध्ये कृषी व्यावसायिक विषय (Vocational Agriculture): १०% अतिरिक्त गुण.',
          'NCC किंवा NSS प्रमाणपत्र: २% अतिरिक्त गुण.',
          'क्रीडा स्पर्धा (Sports) राज्य/राष्ट्रीय प्राविण्य: २% ते ४% अतिरिक्त गुण.',
        ],
      },
    },
    fees: {
      en: {
        summary: 'Agriculture CAP Application Fees:',
        items: [
          'Open Category / OMS Candidates: ₹ 1,000/-',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC, EWS) & PwD: ₹ 800/-',
        ],
      },
      mr: {
        summary: 'कृषी CAP प्रवेश अर्ज शुल्क:',
        items: [
          'खुला प्रवर्ग (Open) / OMS: ₹ १,०००/-',
          'राखीव प्रवर्ग (SC, ST, VJ/NT, OBC, SBC, EWS) व दिव्यांग: ₹ ८००/-',
        ],
      },
    },
    documents: {
      en: {
        summary: 'Documents required for Agriculture CAP Verification (Page 12, 18 of Brochure):',
        mandatory: [
          '1. SSC (10th) Marksheet & Passing Certificate',
          '2. HSC (12th Science) Marksheet',
          '3. MHT-CET 2026 Score Card (PCB or PCM) or NEET Score Card',
          '4. Maharashtra Domicile / Birth Certificate',
          '5. 7/12 Land Extract (recent copy) AND Agriculturist Certificate in Appendix "D" signed by Tahsildar (if claiming 12% farmer weightage)',
        ],
        category: [
          '6. Caste Certificate (SC, ST, VJ/NT, OBC, SBC)',
          '7. Caste Validity Certificate (mandatory from Scrutiny Committee)',
          '8. Non-Creamy Layer (NCL) Certificate valid up to 31st March 2027 (for OBC, VJ/NT, SBC)',
          '9. EWS Certificate for current financial year',
          '10. Landless Agricultural Labourer Certificate (Form VIII) if applicable',
          '11. Vocational Agriculture 10+2 marksheet (if claiming 10% weightage)',
        ],
        notes: [
          'The 7/12 extract must be for the current revenue year and certified with Tahsildar signature in Appendix D format.',
          'Without Appendix D agriculturist certificate, 12% weightage marks cannot be granted.',
        ],
      },
      mr: {
        summary: 'कृषी CAP पडताळणीसाठी आवश्यक अधिकृत कागदपत्रे (माहिती पुस्तिका पृष्ठ १२ व १८):',
        mandatory: [
          '१. SSC (१० वी) गुणपत्रिका व प्रमाणपत्र',
          '२. HSC (१२ वी विज्ञान) गुणपत्रिका',
          '३. MHT-CET २०२६ Score Card (PCB किंवा PCM) / NEET गुणपत्रिका',
          '४. महाराष्ट्र अधिवास प्रमाणपत्र (Domicile) किंवा जन्माचा दाखला',
          '५. शेतकरी ७/१२ उतारा (चालू आर्थिक वर्षाचा) व परिशिष्ट "ड" (Appendix D) शेतकरी प्रमाणपत्र तहसीलदारांच्या सहीसह (१२% वेटेजसाठी)',
        ],
        category: [
          '६. जात प्रमाणपत्र (Caste Certificate)',
          '७. जात वैधता प्रमाणपत्र (Caste Validity Certificate — अनिवार्य)',
          '८. नॉन-क्रिमीलेअर (NCL) प्रमाणपत्र — ३१ मार्च २०२७ पर्यंत वैध (VJ/NT, OBC, SBC)',
          '९. EWS पात्रता प्रमाणपत्र (चालू वर्षाचे)',
          '१०. भूमीहीन शेतमजूर प्रमाणपत्र (नमुना ८ — लागू असल्यास १२% वेटेज)',
          '११. १२ वी कृषी व्यावसायिक विषय गुणपत्रिका (१०% वेटेजसाठी)',
        ],
        notes: [
          'शेतकरी १२% वेटेजसाठी केवळ ७/१२ उतारा पुरेसा नसून परिशिष्ट "ड" (Appendix D) मधील शेतकरी दाखला तहसीलदारांचा जोडणे अनिवार्य आहे.',
        ],
      },
    },
  },

  // 4. MBA / MMS CET (TECHNICAL EDUCATION PG)
  'mba': {
    key: 'mba',
    name: 'MAH-MBA / MMS CET',
    marathiName: 'MAH-MBA / MMS CET (व्यवस्थापन पदव्युत्तर पदवी)',
    category: 'Technical',
    level: 'PG',
    eligibility: {
      en: {
        summary: 'Eligibility for MAH-MBA/MMS CET 2026 (Brochure Page 5, Section 2.0):',
        items: [
          'Passed minimum 3-year duration Bachelor Degree in any faculty awarded by a UGC-recognized University.',
          'General / Open Category Candidates: Minimum 50% marks in aggregate at graduation.',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC), EWS & PwD (Maharashtra State): Minimum 45% marks in aggregate.',
          'Candidates appearing for the final year examination of graduation are also eligible to apply.',
        ],
      },
      mr: {
        summary: 'MAH-MBA/MMS CET २०२६ शैक्षणिक पात्रता अटी (पृष्ठ ५, प्रकरण २.०):',
        items: [
          'उमेदवाराने कोणत्याही मान्यताप्राप्त विद्यापीठाची किमान तीन वर्षांची पदवी (Bachelor Degree) कोणत्याही शाखेतून उत्तीर्ण केलेली असावी.',
          'खुला प्रवर्ग (Open / General): पदवी परीक्षेत एकत्रित किमान ५०% गुण आवश्यक.',
          'राखीव प्रवर्ग (SC, ST, VJ/NT, OBC, SBC), EWS व दिव्यांग (महाराष्ट्र राज्य): एकत्रित किमान ४५% गुण आवश्यक.',
          'पदवीच्या अंतिम वर्षाला प्रविष्ट असलेले (Final Year Appearing) विद्यार्थीसुद्धा परीक्षेसाठी पात्र आहेत.',
        ],
      },
    },
    examPattern: {
      en: {
        summary: 'MAH-MBA/MMS CET is a Computer Based Test (CBT) online entrance test for 200 marks (Page 7):',
        items: [
          'Total Questions: 200 Multiple Choice Questions (MCQs), 1 mark each.',
          'Total Duration: 150 Minutes (2 hours 30 minutes). Total Marks: 200.',
          'Logical Reasoning: 75 Questions (75 Marks).',
          'Abstract Reasoning: 25 Questions (25 Marks).',
          'Quantitative Aptitude: 50 Questions (50 Marks).',
          'Verbal Ability & Reading Comprehension: 50 Questions (50 Marks).',
          'NO Negative Marking: Zero negative marking.',
        ],
      },
      mr: {
        summary: 'MAH-MBA/MMS CET परीक्षा संगणक आधारित (CBT) पद्धतीने २०० गुणांसाठी घेतली जाते (पृष्ठ ७):',
        items: [
          'एकूण प्रश्न: २०० बहुपर्यायी प्रश्न (MCQs), प्रत्येक प्रश्नास १ गुण.',
          'एकूण कालावधी: १५० मिनिटे (२ तास ३० मिनिटे). एकूण गुण: २००.',
          'तर्कशास्त्र (Logical Reasoning): ७५ प्रश्न (७५ गुण).',
          'अमूर्त तर्क (Abstract Reasoning): २५ प्रश्न (२५ गुण).',
          'संख्यात्मक अभियोग्यता (Quantitative Aptitude): ५० प्रश्न (५० गुण).',
          'भाषिक क्षमता व आकलन (Verbal Ability & Reading Comprehension): ५० प्रश्न (५० गुण).',
          'नकारात्मक गुणांकन (Negative Marking): कोणतीही नकारात्मक गुणांकन पद्धत नाही.',
        ],
      },
    },
    fees: {
      en: {
        summary: 'MAH-MBA/MMS CET Application Fees (Brochure Page 3):',
        items: [
          'General / Open Category Candidates & OMS: ₹ 1,200/-',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC, EWS) & PwD (Maharashtra State): ₹ 1,000/-',
        ],
      },
      mr: {
        summary: 'MAH-MBA/MMS CET अधिकृत अर्ज शुल्क (पृष्ठ ३):',
        items: [
          'खुला प्रवर्ग (Open) / OMS उमेदवार: ₹ १,२००/-',
          'मागासवर्गीय प्रवर्ग (SC, ST, VJ/NT, OBC, SBC, EWS) व दिव्यांग: ₹ १,०००/-',
        ],
      },
    },
    documents: {
      en: {
        summary: 'Mandatory documents required for MBA/MMS CAP Registration & Scrutiny (Page 16):',
        mandatory: [
          '1. SSC (10th) Marksheet & Passing Certificate',
          '2. HSC (12th) Marksheet or Diploma Marksheet',
          '3. Degree Graduation Marksheets (all semesters / consolidated marksheet for all years)',
          '4. Degree Passing / Provisional / Convocation Certificate',
          '5. MAH-MBA/MMS CET 2026 Official Score Card & Admit Card (or CAT/CMAT/XAT score card)',
          '6. Maharashtra State Domicile Certificate / Birth Certificate indicating place of birth in Maharashtra',
        ],
        category: [
          '7. Caste Certificate (SC, ST, VJ/NT, OBC, SBC)',
          '8. Caste Validity Certificate (mandatory from Divisional Scrutiny Committee)',
          '9. Non-Creamy Layer (NCL) Certificate valid up to 31st March 2027 (for VJ/NT, OBC, SBC)',
          '10. EWS Eligibility Certificate issued by Tahsildar for current financial year',
          '11. CGPA to Percentage Conversion Certificate (if marks are in CGPA/Grade format)',
        ],
        notes: [
          'All semesters marksheets of graduation are mandatory. Single final year marksheet is not accepted without semester marksheets.',
          'Caste Validity and NCL must be produced during scrutiny; otherwise, allotment converts to Open category.',
        ],
      },
      mr: {
        summary: 'MBA/MMS CAP पडताळणीसाठी आवश्यक अधिकृत कागदपत्रे (पृष्ठ १६):',
        mandatory: [
          '१. SSC (१० वी) गुणपत्रिका व बोर्ड प्रमाणपत्र',
          '२. HSC (१२ वी) किंवा पदविका (Diploma) गुणपत्रिका',
          '३. पदवी (Graduation) सर्व सत्रांच्या / वर्षांच्या गुणपत्रिका (All Semesters Marksheet)',
          '४. पदवी उत्तीर्ण / तात्पुरते / दीक्षांत प्रमाणपत्र (Degree Provisional / Passing Certificate)',
          '५. अधिकृत MAH-MBA CET २०२६ Score Card व प्रवेशपत्र (किंवा CAT/CMAT)',
          '६. महाराष्ट्र अधिवास प्रमाणपत्र (Domicile Certificate) किंवा जन्माचा दाखला',
        ],
        category: [
          '७. जात प्रमाणपत्र (Caste Certificate) — मागासवर्गीय प्रवर्गांसाठी',
          '८. जात वैधता प्रमाणपत्र (Caste Validity Certificate — अनिवार्य)',
          '९. नॉन-क्रिमीलेअर (NCL) प्रमाणपत्र — ३१ मार्च २०२७ पर्यंत वैध (VJ/NT, OBC, SBC)',
          '१०. EWS पात्रता प्रमाणपत्र (चालू आर्थिक वर्षाचे)',
          '११. CGPA रूपांतरण प्रमाणपत्र (Conversion Certificate — जर गुण ग्रेड पद्धतीत असतील)',
        ],
        notes: [
          'पदवीच्या सर्व सत्रांच्या (१ ते ६/८ सत्रांच्या) गुणपत्रिका सादर करणे बंधनकारक आहे.',
          'जात वैधता किंवा नॉन-क्रिमीलेअर वेळेत सादर न केल्यास खुल्या प्रवर्गातून (Open) विचार केला जातो.',
        ],
      },
    },
  },

  // 5. MCA CET (TECHNICAL EDUCATION PG)
  'mca': {
    key: 'mca',
    name: 'MAH-MCA CET',
    marathiName: 'MAH-MCA CET (संगणक उपयोजन पदव्युत्तर पदवी)',
    category: 'Technical',
    level: 'PG',
    eligibility: {
      en: {
        summary: 'Eligibility for MAH-MCA CET 2026 (Brochure Page 3, Section 2.1):',
        items: [
          'Passed BCA or Bachelor Degree in Computer Science Engineering or equivalent Degree.',
          'OR Passed B.Sc. / B.Com. / B.A. with Mathematics at 10+2 Level or at Graduation Level.',
          'General / Open Category Candidates: Minimum 50% marks in aggregate at graduation.',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC), EWS & PwD (Maharashtra State): Minimum 45% marks in aggregate.',
          'Final year graduation appearing candidates are eligible to apply.',
        ],
      },
      mr: {
        summary: 'MAH-MCA CET २०२६ शैक्षणिक पात्रता अटी (पृष्ठ ३, प्रकरण २.१):',
        items: [
          'उमेदवाराने BCA किंवा B.Sc. (Computer Science / IT) किंवा समकक्ष पदवी उत्तीर्ण केलेली असणे आवश्यक.',
          'किंवा B.Sc. / B.Com. / B.A. पदवी उत्तीर्ण, ज्यामध्ये १२ वी किंवा पदवी स्तरावर गणित (Mathematics) विषय असणे आवश्यक.',
          'खुला प्रवर्ग (Open / General): पदवी परीक्षेत एकत्रित किमान ५०% गुण आवश्यक.',
          'राखीव प्रवर्ग (SC, ST, VJ/NT, OBC, SBC), EWS व दिव्यांग: एकत्रित किमान ४५% गुण आवश्यक.',
          'पदवीच्या अंतिम वर्षाला प्रविष्ट असलेले विद्यार्थीही पात्र आहेत.',
        ],
      },
    },
    examPattern: {
      en: {
        summary: 'MAH-MCA CET 2026 Exam Pattern & Syllabus (Page 4, Section 3.0):',
        items: [
          'Total Questions: 100 Questions (2 marks per question). Total Marks: 200 Marks.',
          'Duration: 90 Minutes. Mode: Online CBT. NO Negative Marking.',
          'Mathematics & Statistics: 30 Questions (60 marks).',
          'Logical / Abstract Reasoning: 30 Questions (60 marks).',
          'English Comprehension & Verbal Ability: 20 Questions (40 marks).',
          'Computer Concepts: 20 Questions (40 marks).',
        ],
      },
      mr: {
        summary: 'MAH-MCA CET परीक्षा स्वरूप व गुणांकन पद्धत (पृष्ठ ४):',
        items: [
          'एकूण प्रश्न: १०० बहुपर्यायी प्रश्न (प्रत्येक प्रश्नास २ गुण). एकूण गुण: २००.',
          'कालावधी: ९० मिनिटे. परीक्षा पद्धत: संगणक आधारित (CBT). कोणतीही नकारात्मक गुणांकन पद्धत नाही.',
          'गणित व सांख्यिकी (Mathematics & Statistics): ३० प्रश्न (६० गुण).',
          'तर्कशास्त्र (Logical / Abstract Reasoning): ३० प्रश्न (६० गुण).',
          'इंग्रजी आकलन (English Comprehension): २० प्रश्न (४० गुण).',
          'संगणक संकल्पना (Computer Concepts): २० प्रश्न (४० गुण).',
        ],
      },
    },
    fees: {
      en: {
        summary: 'MAH-MCA CET Application Fees:',
        items: [
          'Open Category / OMS Candidates: ₹ 1,200/-',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC, EWS) & PwD (Maharashtra): ₹ 1,000/-',
        ],
      },
      mr: {
        summary: 'MAH-MCA CET अधिकृत अर्ज शुल्क रचना:',
        items: [
          'खुला प्रवर्ग (Open) / OMS: ₹ १,२००/-',
          'राखीव प्रवर्ग (SC, ST, VJ/NT, OBC, SBC, EWS) व दिव्यांग: ₹ १,०००/-',
        ],
      },
    },
    documents: {
      en: {
        summary: 'Required documents for MCA CAP Registration & Verification (Page 15):',
        mandatory: [
          '1. SSC (10th) Marksheet & Certificate',
          '2. HSC (12th) Marksheet (showing Mathematics if degree is non-computer)',
          '3. Graduation Marksheets (all semesters / consolidated of BCA / B.Sc / B.Tech / B.Com)',
          '4. Degree Passing / Provisional / Convocation Certificate',
          '5. MAH-MCA CET 2026 Official Score Card & Admit Card',
          '6. Maharashtra State Domicile Certificate / Birth Certificate',
        ],
        category: [
          '7. Caste Certificate (SC, ST, VJ/NT, OBC, SBC)',
          '8. Caste Validity Certificate (mandatory from Scrutiny Committee)',
          '9. Non-Creamy Layer valid up to 31st March 2027 (for OBC, VJ/NT, SBC)',
          '10. EWS Certificate for current financial year',
          '11. CGPA conversion certificate if applicable',
        ],
        notes: ['Candidates with non-computer degrees must show proof of Mathematics in 12th or graduation.'],
      },
      mr: {
        summary: 'MCA CAP पडताळणीसाठी आवश्यक कागदपत्रे (पृष्ठ १५):',
        mandatory: [
          '१. SSC (१० वी) गुणपत्रिका व प्रमाणपत्र',
          '२. HSC (१२ वी) गुणपत्रिका (गणित विषयाचा पुरावा)',
          '३. पदवी (Graduation) सर्व सत्रांच्या गुणपत्रिका (BCA / B.Sc / B.Com इत्यादी)',
          '४. पदवी उत्तीर्ण / तात्पुरते प्रमाणपत्र',
          '५. अधिकृत MAH-MCA CET २०२६ Score Card व हॉल तिकीट',
          '६. महाराष्ट्र अधिवास प्रमाणपत्र (Domicile) किंवा जन्माचा दाखला',
        ],
        category: [
          '७. जात प्रमाणपत्र (Caste Certificate)',
          '८. जात वैधता प्रमाणपत्र (Caste Validity Certificate — अनिवार्य)',
          '९. नॉन-क्रिमीलेअर (NCL) प्रमाणपत्र — ३१ मार्च २०२७ पर्यंत वैध',
          '१०. EWS पात्रता प्रमाणपत्र (चालू आर्थिक वर्षाचे)',
        ],
        notes: ['नॉन-कॉम्प्युटर पदवी असल्यास १२ वी किंवा पदवीत गणित विषय असणे आवश्यक आहे.'],
      },
    },
  },

  // 6. LL.B. 3 YEARS CET & CAP (HIGHER EDUCATION UG)
  'llb3': {
    key: 'llb3',
    name: 'MAH-LL.B. 3 Years CET',
    marathiName: 'MAH-LL.B. ३ वर्षे विधी CET (पदवीनंतर ३ वर्षे विधी अभ्यासक्रम)',
    category: 'Higher',
    level: 'UG',
    eligibility: {
      en: {
        summary: 'Eligibility Criteria for LL.B. 3 Years (Brochure Page 5, Section 2.1):',
        items: [
          'Candidate must possess a Bachelor Degree in any discipline from a recognized University.',
          'General / Open Category Candidates: Minimum 45% aggregate marks in graduation.',
          'VJNT, SBC and OBC Candidates (Maharashtra State only): Minimum 42% aggregate marks.',
          'SC and ST Candidates (Maharashtra State only): Minimum 40% aggregate marks.',
          'Candidates appearing for the final year graduation examination are eligible to apply.',
        ],
      },
      mr: {
        summary: 'MAH-LL.B. ३ वर्षे CET शैक्षणिक पात्रता अटी (माहिती पुस्तिका पृष्ठ ५, प्रकरण २.१):',
        items: [
          'उमेदवाराने कोणत्याही मान्यताप्राप्त विद्यापीठाची कोणत्याही शाखेतील पदवी (Bachelor Degree) उत्तीर्ण केलेली असणे आवश्यक.',
          'खुला प्रवर्ग (Open / General): पदवी परीक्षेत एकत्रित किमान ४५% गुण आवश्यक.',
          'विजा/भज, इमाव, विप्र (VJNT, OBC, SBC महाराष्ट्र राज्य): एकत्रित किमान ४२% गुण आवश्यक.',
          'अनु. जाती व अनु. जमाती (SC / ST महाराष्ट्र राज्य): एकत्रित किमान ४०% गुण आवश्यक.',
          'पदवीच्या अंतिम वर्षाला प्रविष्ट असलेले विद्यार्थीही पात्र आहेत.',
        ],
      },
    },
    examPattern: {
      en: {
        summary: 'MAH-LL.B. 3 Yrs. CET Exam Pattern (Page 6, Section 3.1):',
        items: [
          'Total Questions: 150 Multiple Choice Questions (1 mark each). Total Marks: 150 Marks.',
          'Duration: 120 Minutes (2 hours). Medium: English and Marathi. NO Negative Marking.',
          'Legal Aptitude and Legal Reasoning: 30 Questions (30 Marks).',
          'General Knowledge with Current Affairs: 40 Questions (40 Marks).',
          'Logical and Analytical Reasoning: 30 Questions (30 Marks).',
          'English: 50 Questions (50 Marks).',
        ],
      },
      mr: {
        summary: 'MAH-LL.B. ३ वर्षे CET परीक्षा स्वरूप व गुण रचना (पृष्ठ ६):',
        items: [
          'एकूण प्रश्न: १५० बहुपर्यायी प्रश्न (प्रत्येक प्रश्नास १ गुण). एकूण गुण: १५०.',
          'कालावधी: १२० मिनिटे (२ तास). माध्यम: इंग्रजी व मराठी. कोणतीही नकारात्मक गुणांकन पद्धत नाही.',
          'विधी अभियोग्यता व तर्क (Legal Aptitude & Reasoning): ३० प्रश्न (३० गुण).',
          'सामान्य ज्ञान व चालू घडामोडी (GK & Current Affairs): ४० प्रश्न (४० गुण).',
          'तार्किक व विश्लेषणात्मक विचार (Logical Reasoning): ३० प्रश्न (३० गुण).',
          'इंग्रजी भाषा (English): ५० प्रश्न (५० गुण).',
        ],
      },
    },
    fees: {
      en: {
        summary: 'MAH-LL.B. 3 Years CET Application Fees:',
        items: [
          'General / Open Category Candidates & OMS: ₹ 1,000/-',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC, EWS) & PwD (Maharashtra): ₹ 800/-',
        ],
      },
      mr: {
        summary: 'MAH-LL.B. ३ वर्षे CET अधिकृत परीक्षा शुल्क रचना:',
        items: [
          'खुला प्रवर्ग (Open) / OMS उमेदवार: ₹ १,०००/-',
          'राखीव प्रवर्ग (SC, ST, VJ/NT, OBC, SBC, EWS) व दिव्यांग: ₹ ८००/-',
        ],
      },
    },
    documents: {
      en: {
        summary: 'Mandatory Documents Required for LL.B. 3 Years CAP (Brochure Page 18, Section 5.2, Point 3):',
        mandatory: [
          '1. SSC (10th) Marksheet & Passing Certificate',
          '2. HSC (12th) Marksheet & Passing Certificate',
          '3. Degree Graduation Marksheets (all semesters / consolidated marksheet of all years)',
          '4. MAH-LL.B. 3 Yrs CET 2026 Score Card & Admit Card',
          '5. Maharashtra Domicile Certificate / Birth Certificate indicating place of birth in Maharashtra',
        ],
        category: [
          '6. Caste Certificate (SC, ST, VJ/NT, OBC, SBC)',
          '7. Caste Validity Certificate (mandatory from Divisional Scrutiny Committee)',
          '8. Non-Creamy Layer (NCL) Certificate valid up to 31st March 2027 (for VJ/NT, OBC, SBC)',
          '9. EWS Eligibility Certificate issued by Tahsildar for current financial year',
          '10. Conversion Certificate (duly certified percentage conversion if marks are in CGPA/Grade format)',
        ],
        notes: [
          'According to Page 18, Section 5.2 (Point 3), all graduation marksheets are required to verify the exact percentage.',
          'Without Caste Validity or NCL, the candidate cannot be allotted a reserved seat and is converted to Open category.',
        ],
      },
      mr: {
        summary: 'LL.B. ३ वर्षे विधी CAP पडताळणीसाठी आवश्यक अधिकृत कागदपत्रे (माहिती पुस्तिका पृष्ठ १८, प्रकरण ५.२, मुद्दा ३):',
        mandatory: [
          '१. SSC (१० वी) गुणपत्रिका व बोर्ड प्रमाणपत्र',
          '२. HSC (१२ वी) गुणपत्रिका व बोर्ड प्रमाणपत्र',
          '३. पदवी (Graduation) सर्व सत्रांच्या / वर्षांच्या एकत्रित गुणपत्रिका',
          '४. अधिकृत MAH-LL.B. 3 Yrs CET २०२६ Score Card व प्रवेशपत्र',
          '५. महाराष्ट्र अधिवास प्रमाणपत्र (Domicile Certificate) किंवा जन्माचा दाखला (Birth Certificate)',
        ],
        category: [
          '६. जात प्रमाणपत्र (Caste Certificate) — SC, ST, VJ/NT, OBC, SBC प्रवर्गांसाठी',
          '७. जात वैधता प्रमाणपत्र (Caste Validity Certificate — विभागीय पडताळणी समितीचे अधिकृत प्रमाणपत्र अनिवार्य)',
          '८. नॉन-क्रिमीलेअर (NCL) प्रमाणपत्र — ३१ मार्च २०२७ पर्यंत वैध (VJ/NT, OBC, SBC साठी अनिवार्य)',
          '९. EWS पात्रता प्रमाणपत्र — सक्षम अधिकाऱ्याने (तहसीलदार) चालू आर्थिक वर्षासाठी दिलेले',
          '१०. CGPA/Grade गुणांमध्ये रूपांतरण प्रमाणपत्र (Conversion Certificate — विद्यापीठाच्या नियमानुसार)',
        ],
        notes: [
          'अधिकृत माहिती पुस्तिकेतील पृष्ठ १८ (प्रकरण ५.२, मुद्दा ३) नुसार पदवीच्या सर्व सत्रांच्या गुणपत्रिका व CGPA असल्यास रूपांतरण प्रमाणपत्र अनिवार्य आहे.',
          'जात वैधता किंवा नॉन-क्रिमीलेअर वेळेत सादर न केल्यास उमेदवाराचा विचार खुल्या प्रवर्गातून (Open) केला जातो.',
        ],
      },
    },
  },

  // 7. LL.B. 5 YEARS (INTEGRATED) CET & CAP
  'llb5': {
    key: 'llb5',
    name: 'MAH-LL.B. 5 Years (Integrated) CET',
    marathiName: 'MAH-LL.B. ५ वर्षे एकात्मिक विधी CET (१२ वी नंतर ५ वर्षे विधी)',
    category: 'Higher',
    level: 'UG',
    eligibility: {
      en: {
        summary: 'Eligibility for MAH-LL.B. 5 Years CET 2026 (Integrated Law after 12th):',
        items: [
          'Passed Senior Secondary School Examination (10+2 / HSC) from a recognized Board in any stream (Science, Commerce, Arts).',
          'General / Open Category Candidates: Minimum 45% aggregate marks.',
          'VJNT, SBC and OBC Candidates (Maharashtra State only): Minimum 42% aggregate marks.',
          'SC and ST Candidates (Maharashtra State only): Minimum 40% aggregate marks.',
          'Candidates appearing for 12th Board examinations in 2026 are also eligible.',
        ],
      },
      mr: {
        summary: 'MAH-LL.B. ५ वर्षे एकात्मिक विधी CET शैक्षणिक पात्रता अटी (१२ वी नंतर):',
        items: [
          'उमेदवाराने १२ वी (HSC) परीक्षा कोणत्याही शाखेतून (कला, वाणिज्य, विज्ञान) मान्यताप्राप्त मंडळातून उत्तीर्ण केलेली असावी.',
          'खुला प्रवर्ग (Open / General): १२ वी परीक्षेत एकत्रित किमान ४५% गुण आवश्यक.',
          'विजा/भज, इमाव, विप्र (VJNT, OBC, SBC महाराष्ट्र राज्य): एकत्रित किमान ४२% गुण आवश्यक.',
          'अनु. जाती व अनु. जमाती (SC / ST महाराष्ट्र राज्य): एकत्रित किमान ४०% गुण आवश्यक.',
          '१२ वी बोर्ड परीक्षेला प्रविष्ट असलेले विद्यार्थीही पात्र आहेत.',
        ],
      },
    },
    examPattern: {
      en: {
        summary: 'MAH-LL.B. 5 Yrs CET Exam Pattern (150 Questions, 150 Marks, 120 Minutes):',
        items: [
          'Total Marks: 150 Marks (1 mark each). Duration: 120 Minutes. Mode: Online CBT. No Negative Marking.',
          'Legal Aptitude & Legal Reasoning: 40 Questions (40 marks).',
          'General Knowledge with Current Affairs: 30 Questions (30 marks).',
          'Logical and Analytical Reasoning: 40 Questions (40 marks).',
          'English: 30 Questions (30 marks).',
          'Basic Mathematics (10th Std Level): 10 Questions (10 marks).',
        ],
      },
      mr: {
        summary: 'MAH-LL.B. ५ वर्षे CET परीक्षा स्वरूप व गुण रचना:',
        items: [
          'एकूण प्रश्न: १५० बहुपर्यायी प्रश्न (प्रत्येक प्रश्नास १ गुण). एकूण गुण: १५०. कालावधी: १२० मिनिटे.',
          'विधी अभियोग्यता व तर्क (Legal Aptitude): ४० प्रश्न (४० गुण).',
          'सामान्य ज्ञान व चालू घडामोडी (GK & Current Affairs): ३० प्रश्न (३० गुण).',
          'तार्किक विचार (Logical Reasoning): ४० प्रश्न (४० गुण).',
          'इंग्रजी भाषा (English): ३० प्रश्न (३० गुण).',
          'मूलभूत गणित (१० वी पातळी): १० प्रश्न (१० गुण).',
          'नकारात्मक गुणांकन: कोणतीही नकारात्मक गुणांकन पद्धत नाही.',
        ],
      },
    },
    fees: {
      en: {
        summary: 'MAH-LL.B. 5 Years Application Fees:',
        items: [
          'Open Category / OMS: ₹ 1,000/-',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC, EWS) & PwD (Maharashtra): ₹ 800/-',
        ],
      },
      mr: {
        summary: 'MAH-LL.B. ५ वर्षे CET अधिकृत परीक्षा शुल्क रचना:',
        items: [
          'खुला प्रवर्ग (Open) / OMS: ₹ १,०००/-',
          'राखीव प्रवर्ग (SC, ST, VJ/NT, OBC, SBC, EWS) व दिव्यांग: ₹ ८००/-',
        ],
      },
    },
    documents: {
      en: {
        summary: 'Mandatory Documents Required for LL.B. 5 Years CAP Verification:',
        mandatory: [
          '1. SSC (10th) Marksheet & Passing Certificate',
          '2. HSC (12th) Marksheet & Passing Certificate',
          '3. MAH-LL.B. 5 Yrs CET 2026 Score Card & Admit Card',
          '4. Maharashtra State Domicile Certificate / Birth Certificate',
        ],
        category: [
          '5. Caste Certificate (SC, ST, VJ/NT, OBC, SBC)',
          '6. Caste Validity Certificate (mandatory)',
          '7. Non-Creamy Layer (NCL) Certificate valid up to 31st March 2027 (for OBC, VJ/NT, SBC)',
          '8. EWS Certificate for current financial year',
        ],
        notes: ['Graduation marksheets are NOT required since this is a 5-year course after 12th.'],
      },
      mr: {
        summary: 'LL.B. ५ वर्षे विधी CAP पडताळणीसाठी आवश्यक कागदपत्रे:',
        mandatory: [
          '१. SSC (१० वी) गुणपत्रिका व बोर्ड प्रमाणपत्र',
          '२. HSC (१२ वी) गुणपत्रिका व बोर्ड प्रमाणपत्र',
          '३. अधिकृत MAH-LL.B. 5 Yrs CET २०२६ Score Card व हॉल तिकीट',
          '४. महाराष्ट्र अधिवास प्रमाणपत्र (Domicile) किंवा जन्माचा दाखला',
        ],
        category: [
          '५. जात प्रमाणपत्र (Caste Certificate)',
          '६. जात वैधता प्रमाणपत्र (Caste Validity Certificate — अनिवार्य)',
          '७. नॉन-क्रिमीलेअर (NCL) प्रमाणपत्र — ३१ मार्च २०२७ पर्यंत वैध',
          '८. EWS पात्रता प्रमाणपत्र (चालू आर्थिक वर्षाचे)',
        ],
        notes: ['हा १२ वी नंतरचा ५ वर्षांचा अभ्यासक्रम असल्याने पदवी गुणपत्रिकेची आवश्यकता नसते.'],
      },
    },
  },

  // 8. B.ED CET & ELCT (HIGHER EDUCATION UG)
  'bed': {
    key: 'bed',
    name: 'MAH-B.Ed. CET & ELCT',
    marathiName: 'MAH-B.Ed. CET व ELCT (शिक्षक शिक्षण पदवी)',
    category: 'Higher',
    level: 'UG',
    eligibility: {
      en: {
        summary: 'Eligibility for MAH-B.Ed. CET 2026:',
        items: [
          'Bachelor Degree and/or Master Degree in Sciences / Social Sciences / Humanities / Commerce with at least 50% marks for Open category.',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC) of Maharashtra State: At least 45% marks in graduation/post-graduation.',
          'Candidates with Bachelor Degree in Engineering & Technology with Science and Mathematics specialisation: Minimum 55% for Open and 50% for Reserved categories.',
          'Final year graduation students are eligible to apply.',
        ],
      },
      mr: {
        summary: 'MAH-B.Ed. CET २०२६ शैक्षणिक पात्रता अटी:',
        items: [
          'विज्ञान / सामाजिक शास्त्रे / मानव्यविद्या / वाणिज्य शाखेतील पदवी किंवा पदव्युत्तर पदवी खुल्या प्रवर्गासाठी किमान ५०% गुणांसह उत्तीर्ण.',
          'मागासवर्गीय प्रवर्ग (SC, ST, VJ/NT, OBC, SBC महाराष्ट्र राज्य): एकत्रित किमान ४५% गुण आवश्यक.',
          'अभियांत्रिकी व तंत्रज्ञान (B.E./B.Tech) पदवीधारकांसाठी: खुल्या प्रवर्गासाठी किमान ५५% व राखीव प्रवर्गासाठी किमान ५०% गुण आवश्यक.',
          'पदवीच्या अंतिम वर्षाला प्रविष्ट असलेले विद्यार्थीही पात्र आहेत.',
        ],
      },
    },
    examPattern: {
      en: {
        summary: 'MAH-B.Ed. CET Exam Pattern (100 Questions, 100 Marks, 90 Mins) + Optional ELCT (50 Marks):',
        items: [
          'General B.Ed CET: Mental Ability: 40 Qs (40 marks), Teacher Aptitude: 30 Qs (30 marks), General Knowledge: 30 Qs (30 marks). Total 100 Marks.',
          'ELCT (English Language Content Test): Mandatory for candidates seeking admission to English Medium Colleges of Education (50 Qs, 50 marks, 60 minutes).',
          'NO negative marking in both CET and ELCT.',
        ],
      },
      mr: {
        summary: 'MAH-B.Ed. CET परीक्षा स्वरूप (१०० गुण, ९० मिनिटे) + इंग्रजी माध्यमासाठी ELCT (५० गुण):',
        items: [
          'सर्वसाधारण B.Ed CET: मानसिक क्षमता (Mental Ability): ४० प्रश्न (४० गुण), शिक्षक अभियोग्यता (Teacher Aptitude): ३० प्रश्न (३० गुण), सामान्य ज्ञान (GK): ३० प्रश्न (३० गुण). एकूण १०० गुण.',
          'ELCT परीक्षा: इंग्रजी माध्यमाच्या शिक्षण महाविद्यालयांसाठी अनिवार्य (५० प्रश्न, ५० गुण, ६० मिनिटे).',
          'कोणतीही नकारात्मक गुणांकन पद्धत नाही.',
        ],
      },
    },
    fees: {
      en: {
        summary: 'B.Ed CET Application Fees:',
        items: [
          'Open Category / OMS: ₹ 1,000/-',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC, EWS) & PwD (Maharashtra): ₹ 800/-',
        ],
      },
      mr: {
        summary: 'B.Ed CET अधिकृत परीक्षा शुल्क रचना:',
        items: [
          'खुला प्रवर्ग (Open) / OMS: ₹ १,०००/-',
          'राखीव प्रवर्ग (SC, ST, VJ/NT, OBC, SBC, EWS) व दिव्यांग: ₹ ८००/-',
        ],
      },
    },
    documents: {
      en: {
        summary: 'Required documents for B.Ed CAP Verification:',
        mandatory: [
          '1. SSC (10th) Marksheet & Certificate',
          '2. HSC (12th) Marksheet & Certificate',
          '3. Degree Graduation Marksheets (all semesters / consolidated marksheet)',
          '4. Post Graduate Marksheet (if applying on PG marks)',
          '5. MAH-B.Ed CET 2026 Score Card (with ELCT score for English medium)',
          '6. Maharashtra State Domicile Certificate / Birth Certificate',
        ],
        category: [
          '7. Caste Certificate (SC, ST, VJ/NT, OBC, SBC)',
          '8. Caste Validity Certificate (mandatory)',
          '9. Non-Creamy Layer Certificate valid up to 31st March 2027 (for OBC, VJ/NT, SBC)',
          '10. EWS Certificate for current financial year',
        ],
        notes: ['Candidates applying for English medium B.Ed must produce ELCT Score Card.'],
      },
      mr: {
        summary: 'B.Ed CAP पडताळणीसाठी आवश्यक अधिकृत कागदपत्रे:',
        mandatory: [
          '१. SSC (१० वी) गुणपत्रिका व प्रमाणपत्र',
          '२. HSC (१२ वी) गुणपत्रिका व प्रमाणपत्र',
          '३. पदवी (Graduation) सर्व सत्रांच्या गुणपत्रिका',
          '४. पदव्युत्तर पदवी (PG) गुणपत्रिका (लागू असल्यास)',
          '५. अधिकृत MAH-B.Ed CET २०२६ Score Card (इंग्रजी माध्यमासाठी ELCT गुणांसह)',
          '६. महाराष्ट्र अधिवास प्रमाणपत्र (Domicile) किंवा जन्माचा दाखला',
        ],
        category: [
          '७. जात प्रमाणपत्र (Caste Certificate)',
          '८. जात वैधता प्रमाणपत्र (Caste Validity Certificate — अनिवार्य)',
          '९. नॉन-क्रिमीलेअर (NCL) प्रमाणपत्र — ३१ मार्च २०२७ पर्यंत वैध',
          '१०. EWS पात्रता प्रमाणपत्र (चालू आर्थिक वर्षाचे)',
        ],
        notes: ['इंग्रजी माध्यमातील B.Ed साठी ELCT स्कोअर कार्ड असणे आवश्यक आहे.'],
      },
    },
  },

  // 9. MH-NURSING CET (B.SC. NURSING - MEDICAL EDUCATION)
  'nursing': {
    key: 'nursing',
    name: 'MH-Nursing CET (B.Sc. Nursing)',
    marathiName: 'MH-Nursing CET (B.Sc. नर्सिंग — वैद्यकीय शिक्षण)',
    category: 'Medical',
    level: 'UG',
    eligibility: {
      en: {
        summary: 'Eligibility Criteria for MH-Nursing CET 2026 (B.Sc. Nursing):',
        items: [
          'Candidate must have passed 10+2 / HSC with Physics, Chemistry, Biology (PCB) and English individually from a recognized Board.',
          'Open / General Category Candidates: Minimum 45% aggregate marks taken together in PCB.',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC, EWS) belonging to Maharashtra State: Minimum 40% aggregate marks in PCB.',
          'Age Requirement: Candidate must have completed at least 17 years of age on or before 31st December 2026.',
          'Must be medically fit (medical fitness certificate from a registered medical practitioner is mandatory).',
        ],
      },
      mr: {
        summary: 'MH-Nursing CET २०२६ (B.Sc. नर्सिंग) पात्रता अटी:',
        items: [
          'उमेदवाराने १२ वी विज्ञान (HSC Science) परीक्षेत भौतिकशास्त्र, रसायनशास्त्र, जीवशास्त्र (PCB) आणि इंग्रजी हे विषय वैयक्तिकरित्या उत्तीर्ण केलेले असणे आवश्यक.',
          'खुला प्रवर्ग (Open / General): PCB विषयात एकत्रित किमान ४५% गुण आवश्यक.',
          'मागासवर्गीय प्रवर्ग (SC, ST, VJ/NT, OBC, SBC, EWS): PCB विषयात एकत्रित किमान ४०% गुण आवश्यक.',
          'किमान वयोमर्यादा: ३१ डिसेंबर २०२६ रोजी उमेदवाराचे वय किमान १७ वर्षे पूर्ण असणे अनिवार्य आहे.',
          'उमेदवार वैद्यकीयदृष्ट्या सक्षम (Medically Fit) असणे आवश्यक असून वैद्यकीय प्रमाणपत्राची पूर्तता करणे गरजेचे आहे.',
        ],
      },
    },
    examPattern: {
      en: {
        summary: 'MH-Nursing CET Exam Pattern (100 Questions, 100 Marks, 90 Minutes):',
        items: [
          'Total Questions: 100 Multiple Choice Questions (1 mark each). Total Marks: 100 Marks.',
          'Duration: 90 Minutes. Mode: Online CBT. Medium: English only. NO Negative Marking.',
          'Physics: 20 Questions (20 Marks).',
          'Chemistry: 20 Questions (20 Marks).',
          'Biology: 20 Questions (20 Marks).',
          'English: 20 Questions (20 Marks).',
          'Nursing Aptitude: 20 Questions (20 Marks).',
        ],
      },
      mr: {
        summary: 'MH-Nursing CET परीक्षा स्वरूप व गुण रचना (१०० गुण, ९० मिनिटे):',
        items: [
          'एकूण प्रश्न: १०० बहुपर्यायी प्रश्न (प्रत्येक प्रश्नास १ गुण). एकूण गुण: १००. कालावधी: ९० मिनिटे.',
          'माध्यम: केवळ इंग्रजी. परीक्षा पद्धत: संगणक आधारित (CBT). कोणतीही नकारात्मक गुणांकन पद्धत नाही.',
          'भौतिकशास्त्र (Physics): २० प्रश्न (२० गुण).',
          'रसायनशास्त्र (Chemistry): २० प्रश्न (२० गुण).',
          'जीवशास्त्र (Biology): २० प्रश्न (२० गुण).',
          'इंग्रजी भाषा (English): २० प्रश्न (२० गुण).',
          'नर्सिंग अभियोग्यता (Nursing Aptitude): २० प्रश्न (२० गुण).',
        ],
      },
    },
    fees: {
      en: {
        summary: 'MH-Nursing CET Application Fees:',
        items: [
          'Open Category / OMS: ₹ 1,000/-',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC, EWS) & PwD (Maharashtra): ₹ 800/-',
        ],
      },
      mr: {
        summary: 'MH-Nursing CET परीक्षा शुल्क रचना:',
        items: [
          'खुला प्रवर्ग (Open) / OMS: ₹ १,०००/-',
          'राखीव प्रवर्ग (SC, ST, VJ/NT, OBC, SBC, EWS) व दिव्यांग: ₹ ८००/-',
        ],
      },
    },
    documents: {
      en: {
        summary: 'Mandatory Documents Required for B.Sc. Nursing CAP Verification:',
        mandatory: [
          '1. SSC (10th) Marksheet & Passing Certificate',
          '2. HSC (12th) Marksheet showing Physics, Chemistry, Biology and English marks',
          '3. MH-Nursing CET 2026 Official Score Card & Admit Card',
          '4. Maharashtra State Domicile Certificate / Birth Certificate',
          '5. Medical Fitness Certificate (in official Annexure format issued by a registered medical practitioner)',
        ],
        category: [
          '6. Caste Certificate (SC, ST, VJ/NT, OBC, SBC)',
          '7. Caste Validity Certificate (mandatory from Scrutiny Committee)',
          '8. Non-Creamy Layer (NCL) Certificate valid up to 31st March 2027 (for VJ/NT, OBC, SBC)',
          '9. EWS Certificate for current financial year',
        ],
        notes: [
          'Minimum age 17 years is strictly verified from 10th marksheet / birth certificate.',
          'Medical Fitness Certificate is compulsory for confirmation of admission.',
        ],
      },
      mr: {
        summary: 'B.Sc. नर्सिंग CAP पडताळणीसाठी आवश्यक अधिकृत कागदपत्रे:',
        mandatory: [
          '१. SSC (१० वी) गुणपत्रिका व बोर्ड प्रमाणपत्र (वयाचा पुरावा)',
          '२. HSC (१२ वी) गुणपत्रिका (PCB व इंग्रजी गुणांसह)',
          '३. अधिकृत MH-Nursing CET २०२६ Score Card व हॉल तिकीट',
          '४. महाराष्ट्र अधिवास प्रमाणपत्र (Domicile) किंवा जन्माचा दाखला',
          '५. वैद्यकीय सक्षमता प्रमाणपत्र (Medical Fitness Certificate — अधिकृत नमुन्यातील)',
        ],
        category: [
          '६. जात प्रमाणपत्र (Caste Certificate)',
          '७. जात वैधता प्रमाणपत्र (Caste Validity Certificate — अनिवार्य)',
          '८. नॉन-क्रिमीलेअर (NCL) प्रमाणपत्र — ३१ मार्च २०२७ पर्यंत वैध',
          '९. EWS पात्रता प्रमाणपत्र (चालू आर्थिक वर्षाचे)',
        ],
        notes: [
          '३१ डिसेंबर रोजी १७ वर्षे पूर्ण असल्याचे १० वी गुणपत्रिकेवरून तपासले जाते.',
          'वैद्यकीय सक्षमता प्रमाणपत्र (Medical Fitness) प्रवेशावेळी अनिवार्य आहे.',
        ],
      },
    },
  },

  // 10. B.DESIGN CET (FINE ART EDUCATION)
  'bdesign': {
    key: 'bdesign',
    name: 'MAH-B.Design CET',
    marathiName: 'MAH-B.Design CET (डिझाइन पदवी)',
    category: 'Fine Art',
    level: 'UG',
    eligibility: {
      en: {
        summary: 'Eligibility for MAH-B.Design CET 2026:',
        items: [
          'Passed 10+2 (HSC) or equivalent examination from a recognized Board in any stream (Science, Commerce, Arts).',
          'General / Open Category Candidates: Minimum 45% aggregate marks.',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC), EWS & PwD (Maharashtra State): Minimum 40% aggregate marks.',
          'Candidates appearing for 12th Board examinations in 2026 are also eligible.',
        ],
      },
      mr: {
        summary: 'MAH-B.Design CET २०२६ शैक्षणिक पात्रता अटी:',
        items: [
          'उमेदवाराने १२ वी (HSC) परीक्षा कोणत्याही शाखेतून (कला, वाणिज्य, विज्ञान) मान्यताप्राप्त मंडळातून उत्तीर्ण केलेली असावी.',
          'खुला प्रवर्ग (Open / General): १२ वी परीक्षेत एकत्रित किमान ४५% गुण आवश्यक.',
          'मागासवर्गीय प्रवर्ग (SC, ST, VJ/NT, OBC, SBC), EWS व दिव्यांग: एकत्रित किमान ४०% गुण आवश्यक.',
          '१२ वी बोर्ड परीक्षेला प्रविष्ट असलेले विद्यार्थीही पात्र आहेत.',
        ],
      },
    },
    examPattern: {
      en: {
        summary: 'MAH-B.Design CET Exam Pattern (100 Questions, 100 Marks, 90 Minutes):',
        items: [
          'Total Marks: 100 Marks. Total Questions: 100 MCQs (1 mark each). Duration: 90 Minutes. Mode: Online CBT. No Negative Marking.',
          'Design Aptitude & General Knowledge: 25 Questions (25 marks).',
          'Visual Spatial Ability: 25 Questions (25 marks).',
          'Observation & Problem Solving: 25 Questions (25 marks).',
          'Creative Thinking & Innovation: 25 Questions (25 marks).',
        ],
      },
      mr: {
        summary: 'MAH-B.Design CET परीक्षा स्वरूप व गुण रचना (१०० गुण, ९० मिनिटे):',
        items: [
          'एकूण प्रश्न: १०० बहुपर्यायी प्रश्न (प्रत्येक प्रश्नास १ गुण). एकूण गुण: १००. कालावधी: ९० मिनिटे. कोणतीही नकारात्मक गुणांकन पद्धत नाही.',
          'डिझाइन अभियोग्यता व सामान्य ज्ञान: २५ प्रश्न (२५ गुण).',
          'दृश्यात्मक अवकाशीय क्षमता (Visual Spatial Ability): २५ प्रश्न (२५ गुण).',
          'निरीक्षण व समस्या निवारण: २५ प्रश्न (२५ गुण).',
          'सृजनशील विचार (Creative Thinking): २५ प्रश्न (२५ गुण).',
        ],
      },
    },
    fees: {
      en: {
        summary: 'B.Design CET Application Fees:',
        items: [
          'Open Category / OMS: ₹ 1,000/-',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC, EWS) & PwD (Maharashtra): ₹ 800/-',
        ],
      },
      mr: {
        summary: 'B.Design CET अधिकृत परीक्षा शुल्क रचना:',
        items: [
          'खुला प्रवर्ग (Open) / OMS: ₹ १,०००/-',
          'राखीव प्रवर्ग (SC, ST, VJ/NT, OBC, SBC, EWS) व दिव्यांग: ₹ ८००/-',
        ],
      },
    },
    documents: {
      en: {
        summary: 'Required documents for B.Design CAP Verification:',
        mandatory: [
          '1. SSC (10th) Marksheet & Certificate',
          '2. HSC (12th) Marksheet & Certificate',
          '3. MAH-B.Design CET 2026 Score Card',
          '4. Maharashtra State Domicile Certificate / Birth Certificate',
        ],
        category: [
          '5. Caste Certificate (SC, ST, VJ/NT, OBC, SBC)',
          '6. Caste Validity Certificate (mandatory)',
          '7. Non-Creamy Layer valid up to 31st March 2027 (for OBC, VJ/NT, SBC)',
          '8. EWS Certificate for current financial year',
        ],
        notes: ['Graduation marksheets are NOT required since this is an undergraduate course after 12th.'],
      },
      mr: {
        summary: 'B.Design CAP पडताळणीसाठी आवश्यक कागदपत्रे:',
        mandatory: [
          '१. SSC (१० वी) गुणपत्रिका व बोर्ड प्रमाणपत्र',
          '२. HSC (१२ वी) गुणपत्रिका व बोर्ड प्रमाणपत्र',
          '३. अधिकृत MAH-B.Design CET २०२६ Score Card',
          '४. महाराष्ट्र अधिवास प्रमाणपत्र (Domicile) किंवा जन्माचा दाखला',
        ],
        category: [
          '५. जात प्रमाणपत्र (Caste Certificate)',
          '६. जात वैधता प्रमाणपत्र (Caste Validity Certificate — अनिवार्य)',
          '७. नॉन-क्रिमीलेअर (NCL) प्रमाणपत्र — ३१ मार्च २०२७ पर्यंत वैध',
          '८. EWS पात्रता प्रमाणपत्र (चालू आर्थिक वर्षाचे)',
        ],
        notes: ['हा १२ वी नंतरचा अभ्यासक्रम असल्याने पदवी गुणपत्रिकेची आवश्यकता नसते.'],
      },
    },
  },

  // 11. BHMCT / BCA / BBA / BMS / BBM CET
  'bca-bba': {
    key: 'bca-bba',
    name: 'MAH-BHMCT / BCA / BBA / BMS / BBM CET',
    marathiName: 'MAH-BCA / BBA / BMS / BBM / BHMCT CET',
    category: 'Technical',
    level: 'UG',
    eligibility: {
      en: {
        summary: 'Eligibility for MAH-BCA / BBA / BMS / BBM CET 2026:',
        items: [
          'Passed 10+2 (HSC) or equivalent examination in any stream (Commerce, Arts, Science, Vocational) from a recognized Board.',
          'General / Open Category Candidates: Minimum 45% aggregate marks.',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC), EWS & PwD (Maharashtra State): Minimum 40% aggregate marks.',
          'Candidates appearing for 12th Board examinations in 2026 are also eligible.',
        ],
      },
      mr: {
        summary: 'MAH-BCA / BBA / BMS / BBM CET २०२६ शैक्षणिक पात्रता अटी:',
        items: [
          'उमेदवाराने १२ वी (HSC) परीक्षा कोणत्याही शाखेतून (वाणिज्य, कला, विज्ञान, व्होकेशनल) मान्यताप्राप्त मंडळातून उत्तीर्ण केलेली असावी.',
          'खुला प्रवर्ग (Open / General): १२ वी परीक्षेत एकत्रित किमान ४५% गुण आवश्यक.',
          'मागासवर्गीय प्रवर्ग (SC, ST, VJ/NT, OBC, SBC), EWS व दिव्यांग: एकत्रित किमान ४०% गुण आवश्यक.',
          '१२ वी बोर्ड परीक्षेला प्रविष्ट असलेले विद्यार्थीही पात्र आहेत.',
        ],
      },
    },
    examPattern: {
      en: {
        summary: 'Exam Pattern for BCA / BBA / BMS / BBM CET (100 Questions, 100 Marks, 90 Minutes):',
        items: [
          'Total Questions: 100 MCQs (1 mark each). Total Marks: 100 Marks. Duration: 90 Minutes. Online CBT. NO Negative Marking.',
          'English Language: 40 Questions (40 marks).',
          'Reasoning (Verbal and Arithmetic): 30 Questions (30 marks).',
          'General Knowledge & Awareness: 15 Questions (15 marks).',
          'Computer Basics: 15 Questions (15 marks).',
        ],
      },
      mr: {
        summary: 'BCA / BBA / BMS / BBM CET परीक्षा स्वरूप व गुण रचना (१०० गुण, ९० मिनिटे):',
        items: [
          'एकूण प्रश्न: १०० बहुपर्यायी प्रश्न (प्रत्येक प्रश्नास १ गुण). एकूण गुण: १००. कालावधी: ९० मिनिटे. कोणतीही नकारात्मक गुणांकन पद्धत नाही.',
          'इंग्रजी भाषा (English Language): ४० प्रश्न (४० गुण).',
          'तर्कशास्त्र व गणित (Reasoning & Arithmetic): ३० प्रश्न (३० गुण).',
          'सामान्य ज्ञान (General Knowledge): १५ प्रश्न (१५ गुण).',
          'संगणक मूलभूत ज्ञान (Computer Basics): १५ प्रश्न (१५ गुण).',
        ],
      },
    },
    fees: {
      en: {
        summary: 'BCA / BBA / BMS / BBM CET Application Fees:',
        items: [
          'Open Category / OMS: ₹ 1,000/-',
          'Reserved Categories (SC, ST, VJ/NT, OBC, SBC, EWS) & PwD (Maharashtra): ₹ 800/-',
        ],
      },
      mr: {
        summary: 'BCA / BBA CET परीक्षा शुल्क रचना:',
        items: [
          'खुला प्रवर्ग (Open) / OMS: ₹ १,०००/-',
          'राखीव प्रवर्ग (SC, ST, VJ/NT, OBC, SBC, EWS) व दिव्यांग: ₹ ८००/-',
        ],
      },
    },
    documents: {
      en: {
        summary: 'Required documents for BCA / BBA / BMS / BBM CAP Verification:',
        mandatory: [
          '1. SSC (10th) Marksheet & Certificate',
          '2. HSC (12th) Marksheet & Certificate',
          '3. MAH-BCA/BBA/BMS/BBM CET 2026 Score Card',
          '4. Maharashtra State Domicile Certificate / Birth Certificate',
        ],
        category: [
          '5. Caste Certificate (SC, ST, VJ/NT, OBC, SBC)',
          '6. Caste Validity Certificate (mandatory)',
          '7. Non-Creamy Layer valid up to 31st March 2027 (for OBC, VJ/NT, SBC)',
          '8. EWS Certificate for current financial year',
        ],
        notes: ['Course is after 12th; no graduation marksheets required.'],
      },
      mr: {
        summary: 'BCA / BBA / BMS / BBM CAP पडताळणीसाठी आवश्यक कागदपत्रे:',
        mandatory: [
          '१. SSC (१० वी) गुणपत्रिका व बोर्ड प्रमाणपत्र',
          '२. HSC (१२ वी) गुणपत्रिका व बोर्ड प्रमाणपत्र',
          '३. अधिकृत CET २०२६ Score Card व हॉल तिकीट',
          '४. महाराष्ट्र अधिवास प्रमाणपत्र (Domicile) किंवा जन्माचा दाखला',
        ],
        category: [
          '५. जात प्रमाणपत्र (Caste Certificate)',
          '६. जात वैधता प्रमाणपत्र (Caste Validity Certificate — अनिवार्य)',
          '७. नॉन-क्रिमीलेअर (NCL) प्रमाणपत्र — ३१ मार्च २०२७ पर्यंत वैध',
          '८. EWS पात्रता प्रमाणपत्र (चालू वर्षाचे)',
        ],
        notes: ['हा १२ वी नंतरचा अभ्यासक्रम असल्याने पदवी गुणपत्रिकेची आवश्यकता नसते.'],
      },
    },
  },
};

/**
 * Resolves the course profile from courseName string or chunk
 */
export function resolveCourseProfile(courseName?: string, docId?: string): CourseProfile {
  const c = (courseName || '').toLowerCase();
  const id = (docId || '').toLowerCase();

  if (c.includes('pharm') || id.includes('pharm')) {
    return CET_COURSE_PROFILES['mht-cet-pharm'];
  }
  if (c.includes('agri') || id.includes('agri') || c.includes('7/12') || c.includes('horticulture')) {
    return CET_COURSE_PROFILES['agri'];
  }
  if (c.includes('mba') || c.includes('mms') || id.includes('mba')) {
    return CET_COURSE_PROFILES['mba'];
  }
  if (c.includes('mca') || id.includes('mca')) {
    return CET_COURSE_PROFILES['mca'];
  }
  if (c.includes('ll.b. 3') || c.includes('llb 3') || c.includes('llb-3') || c.includes('l.l.b.3') || id.includes('llb-3')) {
    return CET_COURSE_PROFILES['llb3'];
  }
  if (c.includes('ll.b. 5') || c.includes('llb 5') || c.includes('llb-5') || c.includes('llb5') || id.includes('llb-5') || id.includes('llb5')) {
    return CET_COURSE_PROFILES['llb5'];
  }
  if (c.includes('b.ed') || c.includes('bed') || id.includes('bed')) {
    return CET_COURSE_PROFILES['bed'];
  }
  if (c.includes('nursing') || id.includes('nursing')) {
    return CET_COURSE_PROFILES['nursing'];
  }
  if (c.includes('design') || id.includes('design')) {
    return CET_COURSE_PROFILES['bdesign'];
  }
  if (c.includes('bca') || c.includes('bba') || c.includes('bms') || c.includes('bbm') || c.includes('bhmct')) {
    return CET_COURSE_PROFILES['bca-bba'];
  }

  // Default to MHT-CET Engineering
  return CET_COURSE_PROFILES['mht-cet-eng'];
}
