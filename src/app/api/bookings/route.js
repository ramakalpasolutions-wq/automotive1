import { requireStaff } from "@/lib/staffAuth";
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { currentUser } from "@/lib/userAuth";
import { bookedCounts, DATE_RE, SLOT_CAPACITY, SLOT_TIMES, slotPassed } from "@/lib/slots";

const DBNAME = "automotivecarcare";
const COLLECTIONNAME = "bookings";

export async function GET(request) {
  const denied = requireStaff(request, "manager"); // admin or manager
  if (denied) return denied;
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const bookings = await db
      .collection(COLLECTIONNAME)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    // Customers must be signed in to book (website cookie or app token).
    const user = await currentUser(request).catch(() => null);
    if (!user) {
      return NextResponse.json({ success: false, error: "Please sign in to book a service.", signInRequired: true }, { status: 401 });
    }
    const body = await request.json();

    const requiredFields = ['name', 'email', 'phone', 'service', 'vehicleBrand', 'vehicleModel', 'bookingDate', 'bookingTime'];
    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Time slot: a real slot, not in the past, and not already full (2 cars per hour).
    if (!DATE_RE.test(body.bookingDate) || !SLOT_TIMES.includes(body.bookingTime)) {
      return NextResponse.json({ success: false, error: "Please choose a valid date and time." }, { status: 400 });
    }
    if (slotPassed(body.bookingDate, body.bookingTime)) {
      return NextResponse.json({ success: false, error: "That time has passed. Please choose a later slot." }, { status: 400 });
    }
    const taken = (await bookedCounts(body.bookingDate))[body.bookingTime] || 0;
    if (taken >= SLOT_CAPACITY) {
      return NextResponse.json(
        { success: false, error: `${body.bookingTime} on ${body.bookingDate} is full. Please choose another time.`, slotFull: true },
        { status: 409 }
      );
    }

    // Home pickup: we collect the car from the customer's address.
    const wantsPickup = !!body.pickup?.required;
    const pickupAddress = String(body.pickup?.address || "").trim().slice(0, 300);
    if (wantsPickup && pickupAddress.length < 8) {
      return NextResponse.json({ success: false, error: "Please enter the full pickup address." }, { status: 400 });
    }

    const bookingData = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      service: body.service,
      serviceName: body.serviceName || "",
      serviceType: body.serviceType || "general", // ✅ "general" or "special"
      additionalServices: body.additionalServices || [],
      vehicleBrand: body.vehicleBrand || "",
      vehicleModel: body.vehicleModel || "",
      bookingDate: body.bookingDate,
      bookingTime: body.bookingTime,
      notes: body.notes || "",
      pickup: wantsPickup
        ? { required: true, address: pickupAddress, landmark: String(body.pickup?.landmark || "").trim().slice(0, 120) }
        : { required: false },
      userId: String(user._id), // the customer's account
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection(COLLECTIONNAME).insertOne(bookingData);
    const booking = { id: result.insertedId, ...bookingData };

    try {
      const { sendBookingNotification } = await import("@/lib/email");
      await sendBookingNotification(booking);
    } catch (emailError) {
      console.error("Email error:", emailError.message);
    }

    return NextResponse.json({
      success: true,
      booking,
      message: "Booking submitted successfully! Check your email for confirmation."
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const denied = requireStaff(request, "manager"); // admin or manager
  if (denied) return denied;
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const body = await request.json();
    const { _id, status } = body; // ✅ Use _id

    if (!_id) {
      return NextResponse.json({ success: false, error: "Booking ID is required" }, { status: 400 });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(_id)) {
      return NextResponse.json({ success: false, error: "Invalid booking ID format" }, { status: 400 });
    }

    const bookingId = new ObjectId(_id); // ✅ Fixed

    const existingBooking = await db.collection(COLLECTIONNAME).findOne({ _id: bookingId }); // ✅ _id
    if (!existingBooking) {
      return NextResponse.json({ success: false, error: `Booking not found` }, { status: 404 });
    }

    await db.collection(COLLECTIONNAME).updateOne(
      { _id: bookingId }, // ✅ _id
      { $set: { status: status || "confirmed", updatedAt: new Date() } }
    );

    const updatedBooking = await db.collection(COLLECTIONNAME).findOne({ _id: bookingId }); // ✅ _id

    let emailSuccess = false;
    let emailError = null;
    if (status === "confirmed") {
      try {
        const { sendAcceptanceEmail } = await import("@/lib/email");
        await sendAcceptanceEmail(updatedBooking);
        emailSuccess = true;
      } catch (error) {
        emailError = error.message;
      }
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      emailSent: emailSuccess,
      emailError: emailError,
      message: emailSuccess
        ? "Booking confirmed! Confirmation email sent."
        : `Booking confirmed, but email failed: ${emailError}`
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const denied = requireStaff(request); // admin only
  if (denied) return denied;
  try {
    const client = await clientPromise;
    const db = client.db(DBNAME);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Booking ID is required" }, { status: 400 });
    }

    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return NextResponse.json({ success: false, error: "Invalid booking ID format" }, { status: 400 });
    }

    const result = await db.collection(COLLECTIONNAME).deleteOne({ _id: new ObjectId(id) }); // ✅ _id

    if (result.deletedCount === 0) {
      return NextResponse.json({ success: false, error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Booking deleted successfully" });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}