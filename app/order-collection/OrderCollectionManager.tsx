"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

/* =========================================================
   TYPES
========================================================= */

type TabType = "collection" | "reservation";

type Customer = {
  id: string;
  code: string | null;
  name: string;
  active: boolean | null;
};

type SalesChannel = {
  id: string;
  customer_id: string | null;
  channel_group: string | null;
  channel_code: string | null;
  channel_name: string;
  is_active: boolean | null;
};

type DeliveryTarget = {
  id: string;
  customer_id: string;
  code: string | null;
  name: string;
  active: boolean | null;
};

type DeliveryLocation = {
  id: string;
  delivery_target_id: string;
  code: string | null;
  name: string;
  zip_code?: string | null;
  address?: string | null;
  address_detail?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
  active: boolean | null;
};

type ReservationSlot = {
  id: string;
  delivery_location_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  capacity: number | null;
  reserved_qty: number | null;
  unit: string | null;
  active: boolean | null;
};

type Reservation = {
  id: string;
  customer_id: string;
  sales_channel_id: string | null;
  delivery_target_id: string;
  delivery_location_id: string;
  slot_id: string;
  reservation_date: string;
  start_time: string;
  end_time: string;
  reservation_qty: number;
  unit: string;
  pallet_qty?: number;
  box_qty?: number;
  status: string;
  memo: string | null;
  created_at: string;
};

type CollectChannel = {
  code: string;
  name: string;
};

/* =========================================================
   CHANNEL BUTTONS
========================================================= */

const COLLECTION_CHANNELS: CollectChannel[] = [
  { code: "EMART", name: "이마트" },
  { code: "LOTTEMART", name: "롯데마트" },
  { code: "HOMEPLUS", name: "홈플러스" },
  { code: "GS25", name: "GS25" },
  { code: "CU", name: "CU" },
  { code: "SEVEN", name: "세븐일레븐" },
  { code: "OLIVEYOUNG", name: "올리브영" },
  { code: "DAISO", name: "다이소" },
  { code: "ONLINE", name: "온라인" },
];

/* =========================================================
   HELPERS
========================================================= */

function todayString() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shortTime(value: string | null | undefined) {
  if (!value) return "-";
  return value.slice(0, 5);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message ||
        "오류가 발생했습니다."
    );
  }

  return "오류가 발생했습니다.";
}

/* =========================================================
   COMPONENT
========================================================= */

export default function OrderCollectionManager() {
  /* =======================================================
     TAB
  ======================================================= */

  const [activeTab, setActiveTab] =
    useState<TabType>("collection");

  /* =======================================================
     MASTER DATA
  ======================================================= */

  const [customers, setCustomers] =
    useState<Customer[]>([]);

  const [salesChannels, setSalesChannels] =
    useState<SalesChannel[]>([]);

  const [deliveryTargets, setDeliveryTargets] =
    useState<DeliveryTarget[]>([]);

  const [deliveryLocations, setDeliveryLocations] =
    useState<DeliveryLocation[]>([]);

  /* =======================================================
     RESERVATION SELECTED VALUES
  ======================================================= */

  const [customerId, setCustomerId] =
    useState("");

  const [salesChannelId, setSalesChannelId] =
    useState("");

  const [deliveryTargetId, setDeliveryTargetId] =
    useState("");

  const [deliveryLocationId, setDeliveryLocationId] =
    useState("");

  const [deliveryDate, setDeliveryDate] =
    useState(todayString());

  const [selectedSlotId, setSelectedSlotId] =
    useState("");

  /* =======================================================
     QUANTITY
  ======================================================= */

  const [palletQty, setPalletQty] =
    useState("");

  const [boxQty, setBoxQty] =
    useState("");

  const [memo, setMemo] =
    useState("");

  /* =======================================================
     SLOT / RESERVATION
  ======================================================= */

  const [slots, setSlots] =
    useState<ReservationSlot[]>([]);

  const [reservations, setReservations] =
    useState<Reservation[]>([]);

  /* =======================================================
     MESSAGE / LOADING
  ======================================================= */

  const [message, setMessage] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState("");

  const [loadingMaster, setLoadingMaster] =
    useState(false);

  const [loadingSlots, setLoadingSlots] =
    useState(false);

  const [savingReservation, setSavingReservation] =
    useState(false);

  const [collectingCode, setCollectingCode] =
    useState("");

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {
    loadMasterData();
    loadRecentReservations();
  }, []);

  /* =======================================================
     MASTER DATA LOAD
  ======================================================= */

  async function loadMasterData() {
    setLoadingMaster(true);
    setErrorMessage("");

    try {
      const [
        customerResult,
        channelResult,
        targetResult,
        locationResult,
      ] = await Promise.all([
        supabase
          .from("customers")
          .select(`
            id,
            code,
            name,
            active
          `)
          .eq("active", true)
          .order("name"),

        supabase
          .from("sales_channels")
          .select(`
            id,
            customer_id,
            channel_group,
            channel_code,
            channel_name,
            is_active
          `)
          .eq("is_active", true)
          .order("channel_name"),

        supabase
          .from("delivery_targets")
          .select(`
            id,
            customer_id,
            code,
            name,
            active
          `)
          .eq("active", true)
          .order("name"),

        supabase
          .from("delivery_locations")
          .select(`
            id,
            delivery_target_id,
            code,
            name,
            zip_code,
            address,
            address_detail,
            contact_name,
            contact_phone,
            active
          `)
          .eq("active", true)
          .order("name"),
      ]);

      if (customerResult.error) {
        throw customerResult.error;
      }

      if (channelResult.error) {
        throw channelResult.error;
      }

      if (targetResult.error) {
        throw targetResult.error;
      }

      if (locationResult.error) {
        throw locationResult.error;
      }

      setCustomers(
        (customerResult.data || []) as Customer[]
      );

      setSalesChannels(
        (channelResult.data || []) as SalesChannel[]
      );

      setDeliveryTargets(
        (targetResult.data || []) as DeliveryTarget[]
      );

      setDeliveryLocations(
        (locationResult.data || []) as DeliveryLocation[]
      );

      console.log(
        "CUSTOMERS:",
        customerResult.data
      );

      console.log(
        "SALES CHANNELS:",
        channelResult.data
      );

      console.log(
        "DELIVERY TARGETS:",
        targetResult.data
      );

      console.log(
        "DELIVERY LOCATIONS:",
        locationResult.data
      );
    } catch (error) {
      console.error(
        "기준정보 조회 오류:",
        error
      );

      setErrorMessage(
        `기준정보 조회 오류: ${getErrorMessage(error)}`
      );
    } finally {
      setLoadingMaster(false);
    }
  }

  /* =======================================================
     FILTERED MASTER DATA
  ======================================================= */

  const filteredSalesChannels =
    useMemo(() => {
      if (!customerId) {
        return [];
      }

      return salesChannels.filter(
        (item) =>
          item.customer_id === customerId
      );
    }, [
      salesChannels,
      customerId,
    ]);

  const filteredDeliveryTargets =
    useMemo(() => {
      if (!customerId) {
        return [];
      }

      return deliveryTargets.filter(
        (item) =>
          item.customer_id === customerId
      );
    }, [
      deliveryTargets,
      customerId,
    ]);

  const filteredDeliveryLocations =
    useMemo(() => {
      if (!deliveryTargetId) {
        return [];
      }

      return deliveryLocations.filter(
        (item) =>
          item.delivery_target_id ===
          deliveryTargetId
      );
    }, [
      deliveryLocations,
      deliveryTargetId,
    ]);

  /* =======================================================
     SELECTED DISPLAY VALUES
  ======================================================= */

  const selectedCustomer =
    customers.find(
      (item) => item.id === customerId
    );

  const selectedSalesChannel =
    salesChannels.find(
      (item) =>
        item.id === salesChannelId
    );

  const selectedDeliveryTarget =
    deliveryTargets.find(
      (item) =>
        item.id === deliveryTargetId
    );

  const selectedDeliveryLocation =
    deliveryLocations.find(
      (item) =>
        item.id === deliveryLocationId
    );

  const selectedSlot =
    slots.find(
      (item) =>
        item.id === selectedSlotId
    );

  /* =======================================================
     CUSTOMER CHANGE
  ======================================================= */

  function handleCustomerChange(
    value: string
  ) {
    setCustomerId(value);

    setSalesChannelId("");
    setDeliveryTargetId("");
    setDeliveryLocationId("");
    setSelectedSlotId("");
    setSlots([]);

    setMessage("");
    setErrorMessage("");
  }

  /* =======================================================
     SALES CHANNEL CHANGE
  ======================================================= */

  function handleSalesChannelChange(
    value: string
  ) {
    setSalesChannelId(value);

    setMessage("");
    setErrorMessage("");
  }

  /* =======================================================
     DELIVERY TARGET CHANGE
  ======================================================= */

  function handleDeliveryTargetChange(
    value: string
  ) {
    setDeliveryTargetId(value);

    setDeliveryLocationId("");
    setSelectedSlotId("");
    setSlots([]);

    setMessage("");
    setErrorMessage("");
  }

  /* =======================================================
     DELIVERY LOCATION CHANGE
  ======================================================= */

  function handleDeliveryLocationChange(
    value: string
  ) {
    setDeliveryLocationId(value);

    setSelectedSlotId("");
    setSlots([]);

    setMessage("");
    setErrorMessage("");
  }

  /* =======================================================
     LOAD SLOTS
  ======================================================= */

  useEffect(() => {
    if (
      !deliveryLocationId ||
      !deliveryDate
    ) {
      setSlots([]);
      setSelectedSlotId("");
      return;
    }

    loadReservationSlots(
      deliveryLocationId,
      deliveryDate
    );
  }, [
    deliveryLocationId,
    deliveryDate,
  ]);

  async function loadReservationSlots(
    locationId: string,
    date: string
  ) {
    setLoadingSlots(true);
    setSelectedSlotId("");
    setMessage("");
    setErrorMessage("");

    console.log(
      "예약시간 조회 조건:",
      {
        locationId,
        date,
      }
    );

    try {
      const {
        data,
        error,
      } = await supabase
        .from(
          "delivery_reservation_slots"
        )
        .select(`
          id,
          delivery_location_id,
          reservation_date,
          start_time,
          end_time,
          capacity,
          reserved_qty,
          unit,
          active
        `)
        .eq(
          "delivery_location_id",
          locationId
        )
        .eq(
          "reservation_date",
          date
        )
        .eq(
          "active",
          true
        )
        .order(
          "start_time",
          {
            ascending: true,
          }
        );

      console.log(
        "예약시간 조회 결과:",
        data
      );

      console.log(
        "예약시간 조회 오류:",
        error
      );

      if (error) {
        throw error;
      }

      setSlots(
        (data || []) as ReservationSlot[]
      );
    } catch (error) {
      console.error(
        "예약시간 조회 오류:",
        error
      );

      setSlots([]);

      setErrorMessage(
        `예약시간 조회 오류: ${getErrorMessage(error)}`
      );
    } finally {
      setLoadingSlots(false);
    }
  }

  /* =======================================================
     LOAD RECENT RESERVATIONS
  ======================================================= */

  async function loadRecentReservations() {
    try {
      const {
        data,
        error,
      } = await supabase
        .from(
          "delivery_reservations"
        )
        .select(`
          id,
          customer_id,
          sales_channel_id,
          delivery_target_id,
          delivery_location_id,
          slot_id,
          reservation_date,
          start_time,
          end_time,
          reservation_qty,
          unit,
          pallet_qty,
          box_qty,
          status,
          memo,
          created_at
        `)
        .order(
          "created_at",
          {
            ascending: false,
          }
        )
        .limit(20);

      if (error) {
        console.error(
          "예약내역 조회 오류:",
          error
        );

        return;
      }

      setReservations(
        (data || []) as Reservation[]
      );
    } catch (error) {
      console.error(
        "예약내역 조회 최종 오류:",
        error
      );
    }
  }

  /* =======================================================
     RESERVE DELIVERY
  ======================================================= */

  async function reserveDelivery() {
    if (savingReservation) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    /* -----------------------------------------------------
       REQUIRED
    ----------------------------------------------------- */

    if (!customerId) {
      setErrorMessage(
        "화주사를 선택해주세요."
      );
      return;
    }

    if (!salesChannelId) {
      setErrorMessage(
        "판매채널을 선택해주세요."
      );
      return;
    }

    if (!deliveryTargetId) {
      setErrorMessage(
        "납품처를 선택해주세요."
      );
      return;
    }

    if (!deliveryLocationId) {
      setErrorMessage(
        "납품센터를 선택해주세요."
      );
      return;
    }

    if (!deliveryDate) {
      setErrorMessage(
        "납품일자를 선택해주세요."
      );
      return;
    }

    if (!selectedSlotId) {
      setErrorMessage(
        "예약 가능 시간을 선택해주세요."
      );
      return;
    }

    /* -----------------------------------------------------
       QUANTITY
    ----------------------------------------------------- */

    const pallet =
      palletQty.trim() === ""
        ? 0
        : Number(palletQty);

    const box =
      boxQty.trim() === ""
        ? 0
        : Number(boxQty);

    if (
      !Number.isInteger(pallet) ||
      pallet < 0
    ) {
      setErrorMessage(
        "PALLET 수량은 0 이상의 정수로 입력해주세요."
      );
      return;
    }

    if (
      !Number.isInteger(box) ||
      box < 0
    ) {
      setErrorMessage(
        "BOX 수량은 0 이상의 정수로 입력해주세요."
      );
      return;
    }

    if (
      pallet === 0 &&
      box === 0
    ) {
      setErrorMessage(
        "PALLET 또는 BOX 수량을 입력해주세요."
      );
      return;
    }

    setSavingReservation(true);

    try {
      /* ---------------------------------------------------
         SELECT SLOT AGAIN
      --------------------------------------------------- */

      const {
        data: latestSlot,
        error: slotError,
      } = await supabase
        .from(
          "delivery_reservation_slots"
        )
        .select(`
          id,
          delivery_location_id,
          reservation_date,
          start_time,
          end_time,
          capacity,
          reserved_qty,
          unit,
          active
        `)
        .eq(
          "id",
          selectedSlotId
        )
        .eq(
          "active",
          true
        )
        .single();

      if (
        slotError ||
        !latestSlot
      ) {
        console.error(
          "선택 예약시간 조회 오류:",
          slotError
        );

        throw new Error(
          "선택한 예약시간을 확인할 수 없습니다."
        );
      }

      /* ---------------------------------------------------
         VALIDATE SLOT
      --------------------------------------------------- */

      if (
        latestSlot.delivery_location_id !==
        deliveryLocationId
      ) {
        throw new Error(
          "선택한 예약시간과 납품센터가 일치하지 않습니다."
        );
      }

      if (
        latestSlot.reservation_date !==
        deliveryDate
      ) {
        throw new Error(
          "선택한 예약시간과 납품일자가 일치하지 않습니다."
        );
      }

      /* ---------------------------------------------------
         INSERT DATA
      --------------------------------------------------- */

      const reservationData = {
        customer_id:
          customerId,

        sales_channel_id:
          salesChannelId,

        delivery_target_id:
          deliveryTargetId,

        delivery_location_id:
          deliveryLocationId,

        slot_id:
          selectedSlotId,

        reservation_date:
          latestSlot.reservation_date,

        start_time:
          latestSlot.start_time,

        end_time:
          latestSlot.end_time,

        pallet_qty:
          pallet,

        box_qty:
          box,

        /*
          기존 컬럼 호환용입니다.
          pallet_qty / box_qty가 실제 수량 기준입니다.
        */
        reservation_qty:
          pallet > 0
            ? pallet
            : box,

        unit:
          pallet > 0
            ? "PALLET"
            : "BOX",

        status:
          "RESERVED",

        memo:
          memo.trim() === ""
            ? null
            : memo.trim(),
      };

      console.log(
        "납품예약 등록 데이터:",
        reservationData
      );

      const {
        data: reservationResult,
        error: insertReservationError,
      } = await supabase
        .from(
          "delivery_reservations"
        )
        .insert(
          reservationData
        )
        .select()
        .single();

      if (insertReservationError) {
        console.error(
          "===== 납품예약 INSERT 오류 ====="
        );

        console.error(
          "code:",
          insertReservationError.code
        );

        console.error(
          "message:",
          insertReservationError.message
        );

        console.error(
          "details:",
          insertReservationError.details
        );

        console.error(
          "hint:",
          insertReservationError.hint
        );

        console.error(
          "reservationData:",
          JSON.stringify(
            reservationData,
            null,
            2
          )
        );

        throw new Error(
          `${insertReservationError.message} | code=${insertReservationError.code}`
        );
      }

      console.log(
        "납품예약 등록 완료:",
        reservationResult
      );

      /*
        기존 reserved_qty는 PALLET 기준으로만 유지합니다.
        BOX 수량을 PALLET 수량에 합산하지 않습니다.
      */

      if (pallet > 0) {
        const currentReserved =
          Number(
            latestSlot.reserved_qty || 0
          );

        const newReservedQty =
          currentReserved +
          pallet;

        const {
          error: slotUpdateError,
        } = await supabase
          .from(
            "delivery_reservation_slots"
          )
          .update({
            reserved_qty:
              newReservedQty,
          })
          .eq(
            "id",
            selectedSlotId
          );

        if (slotUpdateError) {
          console.error(
            "예약시간 reserved_qty 업데이트 오류:",
            slotUpdateError
          );

          /*
            예약 INSERT는 이미 성공한 상태이므로
            여기서는 전체 예약을 실패 처리하지 않습니다.
          */
        }
      }

      /* ---------------------------------------------------
         SUCCESS
      --------------------------------------------------- */

      setMessage(
        `납품예약이 등록되었습니다. PALLET ${pallet} / BOX ${box}`
      );

      setPalletQty("");
      setBoxQty("");
      setMemo("");
      setSelectedSlotId("");

      await Promise.all([
        loadReservationSlots(
          deliveryLocationId,
          deliveryDate
        ),
        loadRecentReservations(),
      ]);
    } catch (error) {
      console.error(
        "===== 납품예약 최종 오류 ====="
      );

      console.error(
        "error:",
        error
      );

      setErrorMessage(
        getErrorMessage(error)
      );
    } finally {
      setSavingReservation(false);
    }
  }

  /* =======================================================
     RESET RESERVATION
  ======================================================= */

  function resetReservation() {
    setCustomerId("");
    setSalesChannelId("");
    setDeliveryTargetId("");
    setDeliveryLocationId("");
    setDeliveryDate(
      todayString()
    );

    setSelectedSlotId("");
    setSlots([]);

    setPalletQty("");
    setBoxQty("");
    setMemo("");

    setMessage("");
    setErrorMessage("");
  }

  /* =======================================================
     COLLECTION
  ======================================================= */

  /* =======================================================
   주문수집 - 채널별
======================================================= */

async function collectOrders(
  channelCode: string
) {
  setMessage("");
  setErrorMessage("");
  setCollectingCode(channelCode);

  try {
    const channel =
      COLLECTION_CHANNELS.find(
        (item) =>
          item.code === channelCode
      );

    const displayName =
      channel?.name ||
      channelCode;

    console.log(
      "주문수집 테스트:",
      {
        channelCode,
        displayName,
      }
    );

    /*
      현재 실제 판매채널 API 연동 전 단계입니다.
      추후 실제 API 연결 시 이 위치에
      fetch() 코드를 추가합니다.
    */

    await new Promise<void>(
      (resolve) => {
        setTimeout(
          resolve,
          300
        );
      }
    );

    setMessage(
      `${displayName} 주문수집 테스트가 완료되었습니다.`
    );
  } catch (error) {
    console.error(
      "주문수집 오류:",
      error
    );

    setErrorMessage(
      getErrorMessage(error)
    );
  } finally {
    setCollectingCode("");
  }
}


/* =======================================================
   주문수집 - 전체
======================================================= */

async function collectAllOrders() {
  setMessage("");
  setErrorMessage("");
  setCollectingCode("ALL");

  try {
    console.log(
      "전체 주문수집 테스트 시작"
    );

    /*
      현재 실제 판매채널 API 연동 전 단계입니다.
    */

    await new Promise<void>(
      (resolve) => {
        setTimeout(
          resolve,
          300
        );
      }
    );

    setMessage(
      "전체 주문수집 테스트가 완료되었습니다."
    );
  } catch (error) {
    console.error(
      "전체 주문수집 오류:",
      error
    );

    setErrorMessage(
      getErrorMessage(error)
    );
  } finally {
    setCollectingCode("");
  }
}

  /* =======================================================
     CANCEL RESERVATION
  ======================================================= */

  async function cancelReservation(
    reservation: Reservation
  ) {
    const ok =
      window.confirm(
        "이 납품예약을 취소하시겠습니까?"
      );

    if (!ok) {
      return;
    }

    setMessage("");
    setErrorMessage("");

    try {
      const {
        error,
      } = await supabase
        .from(
          "delivery_reservations"
        )
        .update({
          status: "CANCELLED",
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          reservation.id
        );

      if (error) {
        throw error;
      }

      /*
        PALLET 예약수량을 슬롯 reserved_qty에서 차감
      */

      const pallet =
        Number(
          reservation.pallet_qty || 0
        );

      if (
        pallet > 0 &&
        reservation.slot_id
      ) {
        const {
          data: slotData,
          error: slotReadError,
        } = await supabase
          .from(
            "delivery_reservation_slots"
          )
          .select(
            "id, reserved_qty"
          )
          .eq(
            "id",
            reservation.slot_id
          )
          .single();

        if (
          !slotReadError &&
          slotData
        ) {
          const current =
            Number(
              slotData.reserved_qty || 0
            );

          const next =
            Math.max(
              0,
              current - pallet
            );

          await supabase
            .from(
              "delivery_reservation_slots"
            )
            .update({
              reserved_qty: next,
            })
            .eq(
              "id",
              reservation.slot_id
            );
        }
      }

      setMessage(
        "납품예약이 취소되었습니다."
      );

      await loadRecentReservations();

      if (
        deliveryLocationId &&
        deliveryDate
      ) {
        await loadReservationSlots(
          deliveryLocationId,
          deliveryDate
        );
      }
    } catch (error) {
      console.error(
        "예약취소 오류:",
        error
      );

      setErrorMessage(
        getErrorMessage(error)
      );
    }
  }

  /* =======================================================
     DISPLAY HELPERS
  ======================================================= */

  function customerName(
    id: string
  ) {
    return (
      customers.find(
        (item) => item.id === id
      )?.name || "-"
    );
  }

  function channelName(
    id: string | null
  ) {
    if (!id) {
      return "-";
    }

    return (
      salesChannels.find(
        (item) => item.id === id
      )?.channel_name || "-"
    );
  }

  function targetName(
    id: string
  ) {
    return (
      deliveryTargets.find(
        (item) => item.id === id
      )?.name || "-"
    );
  }

  function locationName(
    id: string
  ) {
    return (
      deliveryLocations.find(
        (item) => item.id === id
      )?.name || "-"
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ===================================================
          HEADER
      =================================================== */}

      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-[1500px] px-6 py-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              주문수집 / 납품예약
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              판매채널 주문수집 및 납품예약 관리
            </p>
          </div>
        </div>
      </div>

      {/* ===================================================
          CONTENT
      =================================================== */}

      <div className="mx-auto max-w-[1500px] px-6 py-6">
        {/* =================================================
            TAB
        ================================================= */}

        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab(
                "collection"
              );

              setMessage("");
              setErrorMessage("");
            }}
            className={
              activeTab ===
              "collection"
                ? "rounded-lg bg-slate-900 px-6 py-3 text-sm font-bold text-white"
                : "rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            }
          >
            주문수집
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab(
                "reservation"
              );

              setMessage("");
              setErrorMessage("");
            }}
            className={
              activeTab ===
              "reservation"
                ? "rounded-lg bg-slate-900 px-6 py-3 text-sm font-bold text-white"
                : "rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            }
          >
            납품예약
          </button>
        </div>

        {/* =================================================
            MESSAGE
        ================================================= */}

        {message && (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMessage}
          </div>
        )}

        {/* =================================================
            COLLECTION TAB
        ================================================= */}

        {activeTab ===
          "collection" && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  판매채널 주문수집
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  전체 또는 판매채널별로 주문을 수집합니다.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  collectAllOrders
                }
                disabled={
                  collectingCode !==
                  ""
                }
                className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {collectingCode ===
                "ALL"
                  ? "수집중..."
                  : "전체 주문수집"}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
              {COLLECTION_CHANNELS.map(
                (channel) => (
                  <button
                    key={
                      channel.code
                    }
                    type="button"
                    onClick={() =>
                      collectOrders(
                        channel.code
                      )
                    }
                    disabled={
                      collectingCode !==
                      ""
                    }
                    className="min-h-[82px] rounded-xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-blue-300 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div className="text-sm font-bold text-slate-900">
                      {
                        channel.name
                      }
                    </div>

                    <div className="mt-1 text-xs text-slate-500">
                      {
                        channel.code
                      }
                    </div>

                    {collectingCode ===
                      channel.code && (
                      <div className="mt-2 text-xs font-semibold text-blue-600">
                        주문 수집중...
                      </div>
                    )}
                  </button>
                )
              )}
            </div>

            <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">
              판매채널별 실제 API가 연결되면
              각 버튼에서 해당 채널의 주문조회
              API를 호출하도록 연결하면 됩니다.
            </div>
          </div>
        )}

        {/* =================================================
            RESERVATION TAB
        ================================================= */}

        {activeTab ===
          "reservation" && (
          <div className="space-y-6">
            {/* =============================================
                RESERVATION FORM
            ============================================= */}

            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5">
                <h2 className="text-lg font-bold text-slate-900">
                  납품예약 등록
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  화주사부터 예약시간까지
                  순서대로 선택해주세요.
                </p>
              </div>

              <div className="p-6">
                {loadingMaster && (
                  <div className="mb-5 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    기준정보를 불러오는
                    중입니다.
                  </div>
                )}

                {/* =========================================
                    1. CUSTOMER / CHANNEL
                ========================================= */}

                <div className="mb-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      1
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      화주사 / 판매채널
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        화주사
                      </label>

                      <select
                        value={
                          customerId
                        }
                        onChange={(e) =>
                          handleCustomerChange(
                            e.target
                              .value
                          )
                        }
                        className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="">
                          화주사 선택
                        </option>

                        {customers.map(
                          (
                            customer
                          ) => (
                            <option
                              key={
                                customer.id
                              }
                              value={
                                customer.id
                              }
                            >
                              {
                                customer.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        판매채널
                      </label>

                      <select
                        value={
                          salesChannelId
                        }
                        disabled={
                          !customerId
                        }
                        onChange={(e) =>
                          handleSalesChannelChange(
                            e.target
                              .value
                          )
                        }
                        className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                      >
                        <option value="">
                          판매채널 선택
                        </option>

                        {filteredSalesChannels.map(
                          (
                            channel
                          ) => (
                            <option
                              key={
                                channel.id
                              }
                              value={
                                channel.id
                              }
                            >
                              {
                                channel.channel_name
                              }
                              {channel.channel_group
                                ? ` (${channel.channel_group})`
                                : ""}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* =========================================
                    2. TARGET / LOCATION
                ========================================= */}

                <div className="mb-8 border-t border-slate-100 pt-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      2
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      납품처 / 납품센터
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        납품처
                      </label>

                      <select
                        value={
                          deliveryTargetId
                        }
                        disabled={
                          !customerId
                        }
                        onChange={(e) =>
                          handleDeliveryTargetChange(
                            e.target
                              .value
                          )
                        }
                        className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                      >
                        <option value="">
                          납품처 선택
                        </option>

                        {filteredDeliveryTargets.map(
                          (
                            target
                          ) => (
                            <option
                              key={
                                target.id
                              }
                              value={
                                target.id
                              }
                            >
                              {
                                target.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        납품센터
                      </label>

                      <select
                        value={
                          deliveryLocationId
                        }
                        disabled={
                          !deliveryTargetId
                        }
                        onChange={(e) =>
                          handleDeliveryLocationChange(
                            e.target
                              .value
                          )
                        }
                        className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                      >
                        <option value="">
                          납품센터 선택
                        </option>

                        {filteredDeliveryLocations.map(
                          (
                            location
                          ) => (
                            <option
                              key={
                                location.id
                              }
                              value={
                                location.id
                              }
                            >
                              {
                                location.name
                              }
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* =========================================
                    3. DATE
                ========================================= */}

                <div className="mb-8 border-t border-slate-100 pt-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      3
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      납품일자
                    </h3>
                  </div>

                  <div className="max-w-sm">
                    <input
                      type="date"
                      value={
                        deliveryDate
                      }
                      onChange={(e) => {
                        setDeliveryDate(
                          e.target
                            .value
                        );

                        setSelectedSlotId(
                          ""
                        );
                      }}
                      className="h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* =========================================
                    4. SLOTS
                ========================================= */}

                <div className="mb-8 border-t border-slate-100 pt-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      4
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        예약 가능 시간
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        예약할 시간을
                        선택해주세요.
                      </p>
                    </div>
                  </div>

                  {!deliveryLocationId ? (
                    <div className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                      납품센터를 먼저
                      선택해주세요.
                    </div>
                  ) : loadingSlots ? (
                    <div className="rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                      예약 가능 시간을
                      조회하고 있습니다.
                    </div>
                  ) : slots.length ===
                    0 ? (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      선택한 날짜에 등록된
                      예약 가능 시간이
                      없습니다.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {slots.map(
                        (slot) => {
                          const selected =
                            selectedSlotId ===
                            slot.id;

                          return (
                            <button
                              key={
                                slot.id
                              }
                              type="button"
                              onClick={() =>
                                setSelectedSlotId(
                                  slot.id
                                )
                              }
                              className={
                                selected
                                  ? "min-w-[150px] rounded-lg border border-blue-600 bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-sm"
                                  : "min-w-[150px] rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                              }
                            >
                              {shortTime(
                                slot.start_time
                              )}
                              {" ~ "}
                              {shortTime(
                                slot.end_time
                              )}
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>

                {/* =========================================
                    5. QUANTITY
                ========================================= */}

                <div className="mb-8 border-t border-slate-100 pt-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      5
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        예약수량
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        PALLET과 BOX를
                        각각 입력할 수
                        있습니다.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    {/* PALLET */}

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        PALLET
                      </label>

                      <div className="flex h-12 overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-blue-500">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            palletQty
                          }
                          onChange={(e) =>
                            setPalletQty(
                              e.target
                                .value
                            )
                          }
                          placeholder="0"
                          className="min-w-0 flex-1 border-0 px-4 text-right text-base font-bold text-slate-900 outline-none"
                        />

                        <div className="flex min-w-[92px] items-center justify-center border-l border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600">
                          PALLET
                        </div>
                      </div>
                    </div>

                    {/* BOX */}

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        BOX
                      </label>

                      <div className="flex h-12 overflow-hidden rounded-lg border border-slate-200 bg-white focus-within:border-blue-500">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={
                            boxQty
                          }
                          onChange={(e) =>
                            setBoxQty(
                              e.target
                                .value
                            )
                          }
                          placeholder="0"
                          className="min-w-0 flex-1 border-0 px-4 text-right text-base font-bold text-slate-900 outline-none"
                        />

                        <div className="flex min-w-[92px] items-center justify-center border-l border-slate-200 bg-slate-50 px-4 text-sm font-bold text-slate-600">
                          BOX
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* =========================================
                    6. MEMO
                ========================================= */}

                <div className="mb-8 border-t border-slate-100 pt-8">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      6
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      메모
                    </h3>
                  </div>

                  <textarea
                    rows={4}
                    value={memo}
                    onChange={(e) =>
                      setMemo(
                        e.target.value
                      )
                    }
                    placeholder="납품예약 관련 메모를 입력해주세요."
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white p-4 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {/* =========================================
                    SUMMARY
                ========================================= */}

                <div className="mb-6 rounded-xl bg-slate-50 p-5">
                  <h3 className="mb-4 text-sm font-bold text-slate-900">
                    예약정보 확인
                  </h3>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm md:grid-cols-4">
                    <div>
                      <div className="text-xs text-slate-500">
                        화주사
                      </div>

                      <div className="mt-1 font-semibold text-slate-900">
                        {selectedCustomer?.name ||
                          "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">
                        판매채널
                      </div>

                      <div className="mt-1 font-semibold text-slate-900">
                        {selectedSalesChannel?.channel_name ||
                          "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">
                        납품처
                      </div>

                      <div className="mt-1 font-semibold text-slate-900">
                        {selectedDeliveryTarget?.name ||
                          "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">
                        납품센터
                      </div>

                      <div className="mt-1 font-semibold text-slate-900">
                        {selectedDeliveryLocation?.name ||
                          "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">
                        납품일
                      </div>

                      <div className="mt-1 font-semibold text-slate-900">
                        {deliveryDate ||
                          "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">
                        예약시간
                      </div>

                      <div className="mt-1 font-semibold text-slate-900">
                        {selectedSlot
                          ? `${shortTime(
                              selectedSlot.start_time
                            )} ~ ${shortTime(
                              selectedSlot.end_time
                            )}`
                          : "-"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">
                        PALLET
                      </div>

                      <div className="mt-1 text-lg font-bold text-slate-900">
                        {palletQty ||
                          "0"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-slate-500">
                        BOX
                      </div>

                      <div className="mt-1 text-lg font-bold text-slate-900">
                        {boxQty ||
                          "0"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* =========================================
                    ACTION
                ========================================= */}

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={
                      resetReservation
                    }
                    disabled={
                      savingReservation
                    }
                    className="rounded-lg border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    초기화
                  </button>

                  <button
                    type="button"
                    onClick={
                      reserveDelivery
                    }
                    disabled={
                      savingReservation
                    }
                    className="rounded-lg bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {savingReservation
                      ? "등록중..."
                      : "납품예약 등록"}
                  </button>
                </div>
              </div>
            </div>

            {/* =============================================
                RESERVATION HISTORY
            ============================================= */}

            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    최근 납품예약
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    최근 등록된 예약
                    20건입니다.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    loadRecentReservations
                  }
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  새로고침
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1150px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-bold text-slate-600">
                      <th className="px-4 py-3">
                        화주사
                      </th>

                      <th className="px-4 py-3">
                        판매채널
                      </th>

                      <th className="px-4 py-3">
                        납품처
                      </th>

                      <th className="px-4 py-3">
                        납품센터
                      </th>

                      <th className="px-4 py-3">
                        납품일
                      </th>

                      <th className="px-4 py-3">
                        예약시간
                      </th>

                      <th className="px-4 py-3 text-right">
                        PALLET
                      </th>

                      <th className="px-4 py-3 text-right">
                        BOX
                      </th>

                      <th className="px-4 py-3 text-center">
                        상태
                      </th>

                      <th className="px-4 py-3 text-center">
                        관리
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {reservations.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={10}
                          className="px-6 py-14 text-center text-sm text-slate-500"
                        >
                          등록된 납품예약이
                          없습니다.
                        </td>
                      </tr>
                    ) : (
                      reservations.map(
                        (
                          reservation
                        ) => {
                          const cancelled =
                            reservation.status ===
                            "CANCELLED";

                          return (
                            <tr
                              key={
                                reservation.id
                              }
                              className="border-b border-slate-100 text-sm text-slate-700 hover:bg-slate-50"
                            >
                              <td className="px-4 py-4 font-semibold text-slate-900">
                                {customerName(
                                  reservation.customer_id
                                )}
                              </td>

                              <td className="px-4 py-4">
                                {channelName(
                                  reservation.sales_channel_id
                                )}
                              </td>

                              <td className="px-4 py-4">
                                {targetName(
                                  reservation.delivery_target_id
                                )}
                              </td>

                              <td className="px-4 py-4">
                                {locationName(
                                  reservation.delivery_location_id
                                )}
                              </td>

                              <td className="px-4 py-4 whitespace-nowrap">
                                {
                                  reservation.reservation_date
                                }
                              </td>

                              <td className="px-4 py-4 whitespace-nowrap">
                                {shortTime(
                                  reservation.start_time
                                )}
                                {" ~ "}
                                {shortTime(
                                  reservation.end_time
                                )}
                              </td>

                              <td className="px-4 py-4 text-right text-base font-bold text-slate-900">
                                {reservation.pallet_qty ??
                                  (reservation.unit ===
                                  "PALLET"
                                    ? reservation.reservation_qty
                                    : 0)}
                              </td>

                              <td className="px-4 py-4 text-right text-base font-bold text-slate-900">
                                {reservation.box_qty ??
                                  (reservation.unit ===
                                  "BOX"
                                    ? reservation.reservation_qty
                                    : 0)}
                              </td>

                              <td className="px-4 py-4 text-center">
                                <span
                                  className={
                                    cancelled
                                      ? "inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500"
                                      : "inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"
                                  }
                                >
                                  {cancelled
                                    ? "취소"
                                    : "예약완료"}
                                </span>
                              </td>

                              <td className="px-4 py-4 text-center">
                                {!cancelled ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      cancelReservation(
                                        reservation
                                      )
                                    }
                                    className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50"
                                  >
                                    취소
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    -
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        }
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}