import { NextResponse } from 'next/server';
import { connect, serializeFirestoreData } from '@/lib/db';
import { getAdminSession, adminGuardResponse } from '@/lib/adminAuth';
import { enforceRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function PATCH(req, { params }) {
    const { session, error } = await getAdminSession();
    if (error) return adminGuardResponse(error);

    const limited = await enforceRateLimit(req, 'shortlist', { userId: session.user.id });
    if (limited) return limited;

    const db = await connect();

    const { id } = params;
    const { shortlisted } = await req.json();

    if (typeof shortlisted !== 'boolean') {
        return NextResponse.json({ success: false, message: 'shortlisted must be a boolean' }, { status: 400 });
    }

    try {
        const docRef = db.collection('formData').doc(id);

        // update() throws on a missing document, so check first to return a
        // real 404 instead of a generic 400.
        const existing = await docRef.get();
        if (!existing.exists) {
            return NextResponse.json({ success: false, message: 'Applicant not found' }, { status: 404 });
        }

        await docRef.update({ shortlisted });
        const snapshot = await docRef.get();

        const applicant = {
            id: snapshot.id,
            _id: snapshot.id,
            ...serializeFirestoreData(snapshot.data()),
        };

        return NextResponse.json({ success: true, data: applicant });
    } catch (error) {
        console.error('Error updating applicant:', error.message);
        return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
}
