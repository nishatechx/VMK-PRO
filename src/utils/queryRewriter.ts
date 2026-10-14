/**
 * SAC Ticket Query Rewriter Utility
 *
 * Objective:
 * Rewrite candidate's query from first-person/personal language into a third-person,
 * professional statement written from the counsellor/agent's perspective.
 *
 * Examples:
 * - "By mistake I entered wrong mobile number." -> "The candidate has entered the wrong mobile number by mistake."
 * - "I am not able to login to my account." -> "The candidate is unable to log in to the account."
 * - "I selected wrong college by mistake." -> "The candidate has selected the wrong college by mistake."
 * - "My payment is deducted but status is still showing pending." -> "The candidate's payment has been deducted, but the status is still showing as pending."
 * - "I want to change my mobile number." -> "The candidate wants to change the registered mobile number."
 */

import { GoogleGenAI } from "@google/genai";

export const QUERY_REWRITE_SYSTEM_INSTRUCTION = `You are an expert SAC (Scrutiny and Admission Centre) Ticket counsellor assistant for Maharashtra State Common Entrance Test (CET) and CAP admission portals.

Objective:
Process the candidate grievance text and rewrite it into natural, professional Counsellor/Agent language suitable for submitting an SAC ticket.

Core Requirement:
Convert the candidate's first-person statement into a natural third-person/agent-reported statement, but DO NOT repeatedly use the word "candidate".
The output should sound like a counsellor is clearly explaining the issue to the support team on behalf of the applicant.

Writing Rules:
* Preserve the original issue, meaning, and intent exactly.
* Convert first-person wording such as I, my, me, we into natural professional wording.
* Use "the candidate" / "the applicant" only when necessary for clarity.
* Do not start every sentence with "The candidate".
* After establishing the subject, use natural sentence structures such as:
  - "The candidate has..."
  - "The applicant is..."
  - "The issue is..."
  - "The registered mobile number..."
  - "The application..."
  - "The payment..."
  - "The portal..."
* Avoid repetitive wording.
* Keep the output concise and ticket-ready.
* Correct grammar and sentence structure.
* Do not add assumptions, explanations, or information that is not present in the original text.
* Do not change the actual grievance.
* Do not make the language unnecessarily formal or complicated.
* Do not use phrases like "the candidate stated that", "the candidate mentioned that", or "the candidate reported that" unless they are genuinely necessary.

Important Natural-Language Rule:
Do not mechanically replace every "I/my/me" with "the candidate/candidate's".
Instead, understand the complete meaning and rewrite the statement naturally.
For example:
❌ Bad:
The candidate has entered the wrong mobile number. The candidate wants to change the candidate's mobile number because the candidate is not receiving OTP.
✅ Good:
The candidate has entered the wrong mobile number and wants to change it as the OTP is not being received.

Examples:
- Input: "By mistake I entered wrong mobile number."
  Output: "The candidate has entered the wrong mobile number by mistake."

- Input: "I entered wrong mobile number. I want to change it because I am not receiving OTP on my number."
  Output: "The candidate has entered the wrong mobile number by mistake and is unable to receive the OTP. The registered mobile number needs to be corrected."

- Input: "I paid the fees but my application is still showing payment pending. I also received the amount deducted message."
  Output: "The candidate has completed the fee payment, but the application is still showing payment as pending. The amount has already been deducted from the account."

- Input: "I selected wrong college by mistake and now I want to change my preference."
  Output: "The candidate has selected the wrong college by mistake and wants to change the preference."

- Input: "I am not able to login. My password is correct but it is showing invalid password."
  Output: "The candidate is unable to log in despite entering the correct password. The portal is showing an \"Invalid Password\" message."

Output Format:
Return ONLY the final rewritten SAC query.
Do not return:
* "Converted Query:"
* Explanations
* Bullet points
* Analysis
* Multiple versions
* Labels
* Additional information

The final output must be concise, natural, professional, and ready to paste directly into the SAC ticket Query field.`;

const CANDIDATE_MODELS = [
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
  "gemini-4-argon",
];

/**
 * Checks if the text has first-person pronouns/phrasings.
 */
export function detectFirstPersonLanguage(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  return /\b(i|i'm|i am|i've|i have|i'll|i will|i'd|i would|me|my|mine|myself|we|we're|us|our|ours)\b/i.test(
    text
  );
}

/**
 * Intelligent rule-based converter that acts as an instant fallback or offline transformer.
 */
export function convertQueryToThirdPersonFallback(rawQuery: string): string {
  if (!rawQuery || typeof rawQuery !== 'string') return '';
  let text = rawQuery.trim();
  if (!text) return '';

  // Clean any leading labels
  text = text.replace(/^(?:query|grievance|issue|details|remarks?)\s*[:\-]\s*/i, '').trim();

  // Normalize quotes
  text = text.replace(/^["'“”](.*)["'“”]$/, '$1').trim();

  // Exact canonical example matches
  const normalized = text.toLowerCase().replace(/[.!?,]+$/, '').replace(/\s+/g, ' ').trim();
  if (normalized === 'by mistake i entered wrong mobile number' || normalized === 'i entered wrong mobile number by mistake') {
    return 'The candidate has entered the wrong mobile number by mistake.';
  }
  if (
    normalized === 'i entered wrong mobile number. i want to change it because i am not receiving otp on my number' ||
    normalized === 'i entered wrong mobile number i want to change it because i am not receiving otp on my number' ||
    normalized === 'i entered wrong mobile number, i want to change it because i am not receiving otp on my number'
  ) {
    return 'The candidate has entered the wrong mobile number by mistake and is unable to receive the OTP. The registered mobile number needs to be corrected.';
  }
  if (
    normalized === 'i paid the fees but my application is still showing payment pending. i also received the amount deducted message' ||
    normalized === 'i paid the fees but my application is still showing payment pending i also received the amount deducted message' ||
    normalized === 'i paid the fees but my application is still showing payment pending, i also received the amount deducted message'
  ) {
    return 'The candidate has completed the fee payment, but the application is still showing payment as pending. The amount has already been deducted from the account.';
  }
  if (
    normalized === 'i selected wrong college by mistake and now i want to change my preference' ||
    normalized === 'i selected wrong college by mistake and now want to change my preference' ||
    normalized === 'i selected wrong college by mistake. now i want to change my preference'
  ) {
    return 'The candidate has selected the wrong college by mistake and wants to change the preference.';
  }
  if (
    normalized === 'i am not able to login. my password is correct but it is showing invalid password' ||
    normalized === 'i am not able to login my password is correct but it is showing invalid password' ||
    normalized === "i'm not able to login. my password is correct but it is showing invalid password" ||
    normalized === 'i am unable to login. my password is correct but it is showing invalid password'
  ) {
    return 'The candidate is unable to log in despite entering the correct password. The portal is showing an "Invalid Password" message.';
  }
  if (normalized === 'i am not able to login to my account' || normalized === "i'm not able to login to my account" || normalized === 'i am unable to login to my account') {
    return 'The candidate is unable to log in to the account.';
  }
  if (normalized === 'i selected wrong college by mistake') {
    return 'The candidate has selected the wrong college by mistake.';
  }
  if (normalized === 'my payment is deducted but status is still showing pending') {
    return "The candidate's payment has been deducted, but the status is still showing as pending.";
  }
  if (normalized === 'i want to change my mobile number') {
    return 'The candidate wants to change the registered mobile number.';
  }

  // Handle "By mistake I <verb> ..."
  text = text.replace(
    /\bBy mistake\s+I\s+(entered|selected|typed|chose|uploaded|submitted|filled)\s+(wrong|incorrect)\s+([^.,;]+)/i,
    (_m, verb, qual, item) => `The candidate has ${verb} the ${qual} ${item.trim()} by mistake`
  );

  // Handle "I <verb> wrong ... by mistake"
  text = text.replace(
    /\bI\s+(entered|selected|typed|chose|uploaded|submitted|filled)\s+(wrong|incorrect)\s+([^.,;]+?)\s+by mistake/i,
    (_m, verb, qual, item) => `The candidate has ${verb} the ${qual} ${item.trim()} by mistake`
  );

  // Handle "I am not able to / I cannot / I can't / I am unable to login to my account"
  text = text.replace(
    /\b(?:I am not able to|I'm not able to|I cannot|I can't|I am unable to|I'm unable to)\s+log\s*in\s+(?:to\s+)?(?:my\s+)?account/i,
    'The candidate is unable to log in to the account'
  );

  // Handle "I am not able to / I cannot / I can't / I am unable to <verb>"
  text = text.replace(
    /\b(?:I am not able to|I'm not able to|I cannot|I can't|I am unable to|I'm unable to)\s+([a-z]+)/gi,
    'The candidate is unable to $1'
  );

  // Handle "My payment is deducted but status is still showing pending"
  text = text.replace(
    /\bMy payment is deducted\s*(?:,|\s+)?\s*but\s+status is still showing\s+(?:as\s+)?pending/i,
    "The candidate's payment has been deducted, but the status is still showing as pending"
  );

  // Handle "My <fee/payment> is deducted"
  text = text.replace(
    /\bMy\s+(payment|fee|amount|money)\s+(?:has been|is)\s+deducted/gi,
    "The candidate's $1 has been deducted"
  );

  // Handle "I want to change my mobile number"
  text = text.replace(
    /\bI want to change my (mobile|phone|contact)(?:\s+number)?/i,
    'The candidate wants to change the registered $1 number'
  );

  // Handle "I want to change my <item>"
  text = text.replace(
    /\bI want to change my\s+([a-z\s]+)/gi,
    "The candidate wants to change the registered $1"
  );

  // Handle "I want to / I wish to / I would like to"
  text = text.replace(
    /\b(?:I want to|I wish to|I would like to)\s+/gi,
    'The candidate wants to '
  );

  // Handle "I need to"
  text = text.replace(/\bI need to\s+/gi, 'The candidate needs to ');

  // Handle "I have / I've"
  text = text.replace(/\b(?:I have|I've)\s+/gi, 'The candidate has ');

  // Handle "I forgot / I lost"
  text = text.replace(/\b(?:I forgot|I have forgotten)\s+my\s+/gi, "The candidate has forgotten the registered ");
  text = text.replace(/\b(?:I lost|I have lost)\s+my\s+/gi, "The candidate has lost the ");

  // Handle "I did not receive / I haven't received"
  text = text.replace(/\b(?:I did not receive|I didn't receive|I have not received|I haven't received)\s+my\s+/gi, "The candidate has not received the ");
  text = text.replace(/\b(?:I did not receive|I didn't receive|I have not received|I haven't received)\s+/gi, "The candidate has not received ");

  // Handle "I entered / I filled / I selected / I uploaded" at start
  text = text.replace(/\bI\s+(entered|selected|filled|uploaded|submitted|applied|paid)\s+/gi, 'The candidate has $1 ');

  // Handle "my account" -> "the account"
  text = text.replace(/\bmy account\b/gi, 'the account');
  text = text.replace(/\bmy profile\b/gi, "the candidate's profile");
  text = text.replace(/\bmy application\b/gi, "the candidate's application");
  text = text.replace(/\bmy mobile(?:\s+number)?\b/gi, "the candidate's mobile number");
  text = text.replace(/\bmy email(?:\s+id)?\b/gi, "the candidate's email ID");
  text = text.replace(/\bmy password\b/gi, "the candidate's password");
  text = text.replace(/\bmy documents?\b/gi, "the candidate's document(s)");
  text = text.replace(/\bmy marksheet\b/gi, "the candidate's marksheet");
  text = text.replace(/\bmy certificate\b/gi, "the candidate's certificate");
  text = text.replace(/\bmy details\b/gi, "the candidate's details");

  // General "My " at beginning of sentence
  text = text.replace(/^My\s+/i, "The candidate's ");
  text = text.replace(/([.!?]\s+)My\s+/g, "$1The candidate's ");
  text = text.replace(/\bmy\s+/gi, "the candidate's ");

  // General "I " at beginning of sentence
  text = text.replace(/^I\s+am\s+/i, "The candidate is ");
  text = text.replace(/^I\s+/i, "The candidate ");
  text = text.replace(/([.!?]\s+)I\s+am\s+/g, "$1The candidate is ");
  text = text.replace(/([.!?]\s+)I\s+/g, "$1The candidate ");

  // Remaining first person pronouns
  text = text.replace(/\bme\b/gi, 'the applicant');
  text = text.replace(/\bmyself\b/gi, 'the applicant');
  text = text.replace(/\bour\b/gi, "the registered");
  text = text.replace(/\bwe\b/gi, 'the applicant');

  // Anti-repetition: replace consecutive "The candidate ... The candidate ..." with natural flow
  text = text.replace(/\bThe candidate ([^.]+?)\.\s+The candidate ([^.]+?)\./gi, 'The candidate $1 and $2.');
  text = text.replace(/\bThe candidate wants to change the candidate's\b/gi, 'The candidate wants to change the');
  text = text.replace(/\bthe candidate wants to change the candidate's\b/gi, 'the candidate wants to change the');
  text = text.replace(/\bbecause the candidate is not receiving\b/gi, 'as the OTP is not being received');
  text = text.replace(/\bthe candidate stated that\s+/gi, '');
  text = text.replace(/\bthe candidate reported that\s+/gi, '');
  text = text.replace(/\bthe candidate mentioned that\s+/gi, '');

  // Polish formatting and grammar
  text = text.replace(/\s{2,}/g, ' ').trim();
  if (text.length > 0) {
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (!/[.!?]$/.test(text)) {
      text += '.';
    }
  }

  return text;
}

/**
 * Rewrites a candidate query to third-person professional statement from counsellor/agent perspective.
 * Tries the backend proxy first, falls back to direct client-side Gemini if key is provided,
 * and seamlessly falls back to rule-based converter.
 */
export async function rewriteCandidateQuery(
  rawQuery: string,
  apiKey?: string
): Promise<{
  convertedQuery: string;
  source: 'server-ai' | 'client-ai' | 'rule-fallback';
}> {
  const trimmed = (rawQuery || '').trim();
  if (!trimmed) {
    return { convertedQuery: '', source: 'rule-fallback' };
  }

  // 1. Try backend API proxy route
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey?.trim()) {
      headers['x-gemini-api-key'] = apiKey.trim();
    }

    const response = await fetch('/api/rewrite-query-third-person', {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: trimmed, apiKey: apiKey?.trim() }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data?.convertedQuery && typeof data.convertedQuery === 'string' && data.convertedQuery.trim()) {
        let clean = data.convertedQuery.trim();
        clean = clean.replace(/^(?:Converted Query|Counsellor Query|Agent Query|SAC Query|Output):\s*/i, '');
        clean = clean.replace(/^["'“”](.*)["'“”]$/, '$1').trim();
        return {
          convertedQuery: clean,
          source: data.source === 'rule-fallback' ? 'rule-fallback' : 'server-ai',
        };
      }
    }
  } catch (err) {
    console.warn('[QUERY REWRITE] Backend call failed, trying client-side or fallback:', err);
  }

  // 2. Try client-side direct Gemini call if API key is provided
  if (apiKey && apiKey.trim()) {
    try {
      const ai = new GoogleGenAI({ apiKey: apiKey.trim() });
      for (const model of CANDIDATE_MODELS) {
        try {
          const res = await ai.models.generateContent({
            model,
            contents: `Rewrite this candidate query into a third-person professional statement from the counsellor/agent's perspective:\n\n${trimmed}`,
            config: {
              systemInstruction: QUERY_REWRITE_SYSTEM_INSTRUCTION,
              temperature: 0.1,
            },
          });

          let text = (res.text || '').trim();
          text = text.replace(/^(?:Converted Query|Counsellor Query|Agent Query|SAC Query|Output):\s*/i, '');
          text = text.replace(/^["'“”](.*)["'“”]$/, '$1').trim();

          if (text) {
            return {
              convertedQuery: text,
              source: 'client-ai',
            };
          }
        } catch {
          continue;
        }
      }
    } catch (clientErr) {
      console.warn('[QUERY REWRITE] Client Gemini call failed, using rule-based fallback:', clientErr);
    }
  }

  // 3. Fallback to comprehensive rule-based transformation
  const ruleResult = convertQueryToThirdPersonFallback(trimmed);
  return {
    convertedQuery: ruleResult,
    source: 'rule-fallback',
  };
}
