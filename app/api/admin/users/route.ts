import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type Role =
  | "ADMIN"
  | "MANAGER"
  | "USER";

async function checkAdmin() {
  const supabase =
    await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (
    userError ||
    !user
  ) {
    return {
      ok: false,
      status: 401,
      message: "로그인이 필요합니다.",
      user: null,
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("oms_users")
    .select(
      "id, login_id, name, role, active"
    )
    .eq(
      "auth_user_id",
      user.id
    )
    .maybeSingle();

  if (
    profileError ||
    !profile ||
    !profile.active ||
    profile.role !== "ADMIN"
  ) {
    return {
      ok: false,
      status: 403,
      message:
        "관리자 권한이 필요합니다.",
      user,
    };
  }

  return {
    ok: true,
    status: 200,
    message: "",
    user,
  };
}

/* =====================================================
   사용자 목록
===================================================== */

export async function GET() {
  try {
    const auth =
      await checkAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        {
          message:
            auth.message,
        },
        {
          status:
            auth.status,
        }
      );
    }

    const admin =
      createAdminClient();

    const {
      data,
      error,
    } = await admin
      .from("oms_users")
      .select(
        `
        id,
        auth_user_id,
        login_id,
        name,
        role,
        active,
        created_at
        `
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

    if (error) {
      throw error;
    }

    return NextResponse.json({
      users:
        data || [],
    });
  } catch (error: any) {
    console.error(
      "사용자 목록 오류:",
      error?.message
    );

    return NextResponse.json(
      {
        message:
          error?.message ||
          "사용자 목록 조회 실패",
      },
      {
        status: 500,
      }
    );
  }
}

/* =====================================================
   사용자 생성
===================================================== */

export async function POST(
  request: Request
) {
  try {
    const auth =
      await checkAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        {
          message:
            auth.message,
        },
        {
          status:
            auth.status,
        }
      );
    }

    const body =
      await request.json();

    const loginId =
      String(
        body.login_id || ""
      )
        .trim()
        .toLowerCase();

    const name =
      String(
        body.name || ""
      ).trim();

    const password =
      String(
        body.password || ""
      );

    const role =
      String(
        body.role || "USER"
      ).toUpperCase() as Role;

    if (!loginId) {
      return NextResponse.json(
        {
          message:
            "아이디를 입력해주세요.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !/^[a-z0-9._-]+$/.test(
        loginId
      )
    ) {
      return NextResponse.json(
        {
          message:
            "아이디는 영문 소문자, 숫자, ., _, - 만 사용할 수 있습니다.",
        },
        {
          status: 400,
        }
      );
    }

    if (!name) {
      return NextResponse.json(
        {
          message:
            "이름을 입력해주세요.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      password.length < 6
    ) {
      return NextResponse.json(
        {
          message:
            "비밀번호는 6자 이상 입력해주세요.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      ![
        "ADMIN",
        "MANAGER",
        "USER",
      ].includes(role)
    ) {
      return NextResponse.json(
        {
          message:
            "잘못된 권한입니다.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      createAdminClient();

    /* -----------------------------------------------
       아이디 중복 확인
    ------------------------------------------------ */

    const {
      data: existing,
      error:
        existingError,
    } = await admin
      .from("oms_users")
      .select("id")
      .eq(
        "login_id",
        loginId
      )
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) {
      return NextResponse.json(
        {
          message:
            "이미 사용 중인 아이디입니다.",
        },
        {
          status: 409,
        }
      );
    }

    /*
      실제 Supabase Auth에서는
      내부 이메일을 사용합니다.

      직원에게는 이메일이
      표시되지 않습니다.
    */

    const internalEmail =
      `${loginId}@oms.local`;

    /* -----------------------------------------------
       Supabase Auth 계정 생성
    ------------------------------------------------ */

    const {
      data:
        authData,
      error:
        authError,
    } =
      await admin.auth.admin.createUser({
        email:
          internalEmail,

        password,

        email_confirm:
          true,

        user_metadata: {
          login_id:
            loginId,

          name,

          role,
        },
      });

    if (
      authError ||
      !authData.user
    ) {
      return NextResponse.json(
        {
          message:
            authError?.message ||
            "인증계정 생성 실패",
        },
        {
          status: 400,
        }
      );
    }

    /* -----------------------------------------------
       OMS 사용자 프로필 생성
    ------------------------------------------------ */

    const {
      data:
        profile,
      error:
        profileError,
    } = await admin
      .from("oms_users")
      .insert({
        auth_user_id:
          authData.user.id,

        login_id:
          loginId,

        name,

        role,

        active: true,
      })
      .select(
        `
        id,
        auth_user_id,
        login_id,
        name,
        role,
        active,
        created_at
        `
      )
      .single();

    if (profileError) {
      /*
        프로필 생성 실패 시
        Auth 계정도 되돌림
      */

      await admin.auth.admin.deleteUser(
        authData.user.id
      );

      throw profileError;
    }

    return NextResponse.json(
      {
        message:
          "사용자 계정이 생성되었습니다.",

        user:
          profile,
      },
      {
        status: 201,
      }
    );
  } catch (error: any) {
    console.error(
      "사용자 생성 오류:",
      error?.message
    );

    return NextResponse.json(
      {
        message:
          error?.message ||
          "사용자 생성 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}
/* =====================================================
   사용자 수정
===================================================== */

export async function PATCH(
  request: Request
) {
  try {
    const auth =
      await checkAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        {
          message:
            auth.message,
        },
        {
          status:
            auth.status,
        }
      );
    }

    const body =
      await request.json();

    const id =
      String(
        body.id || ""
      ).trim();

    const action =
      String(
        body.action || ""
      ).trim();

    if (!id) {
      return NextResponse.json(
        {
          message:
            "사용자 ID가 없습니다.",
        },
        {
          status: 400,
        }
      );
    }

    const admin =
      createAdminClient();

    const {
      data: targetUser,
      error: targetError,
    } = await admin
      .from("oms_users")
      .select(
        "id, auth_user_id, login_id, name, role, active"
      )
      .eq("id", id)
      .maybeSingle();

    if (
      targetError ||
      !targetUser
    ) {
      return NextResponse.json(
        {
          message:
            "사용자를 찾을 수 없습니다.",
        },
        {
          status: 404,
        }
      );
    }

    /* 권한 변경 */
    if (
      action === "role"
    ) {
      const role =
        String(
          body.role || ""
        ).toUpperCase() as Role;

      if (
        ![
          "ADMIN",
          "MANAGER",
          "USER",
        ].includes(role)
      ) {
        return NextResponse.json(
          {
            message:
              "잘못된 권한입니다.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        error,
      } = await admin
        .from("oms_users")
        .update({
          role,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        throw error;
      }

      return NextResponse.json({
        message:
          "권한이 변경되었습니다.",
      });
    }

    /* 사용 / 중지 */
if (
  action === "active"
) {
  const active =
    body.active === true;

  /* 현재 로그인한 관리자 본인 중지 방지 */
  if (targetUser.auth_user_id) {
  const {
    error: authUpdateError,
  } =
    await admin.auth.admin.updateUserById(
      targetUser.auth_user_id,
      {
        ban_duration:
          active
            ? "none"
            : "876000h",
      }
    );

  if (authUpdateError) {
    console.error(
      "Auth 상태 변경 오류:",
      authUpdateError
    );

    return NextResponse.json(
      {
        message:
          `DB 상태는 변경됐지만 로그인 차단 처리에 실패했습니다: ${authUpdateError.message}`,
      },
      {
        status: 500,
      }
    );
  }
}
  const {
    data: updatedUser,
    error: updateError,
  } = await admin
    .from("oms_users")
    .update({
      active,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", id)
    .select(
      "id, login_id, active"
    )
    .single();

  if (updateError) {
    console.error(
      "사용자 상태 변경 오류:",
      updateError
    );

    return NextResponse.json(
      {
        message:
          `상태 변경 실패: ${updateError.message}`,
      },
      {
        status: 500,
      }
    );
  }

  console.log(
    "사용자 상태 변경 완료:",
    updatedUser
  );

  return NextResponse.json({
    message:
      active
        ? "사용자 계정이 활성화되었습니다."
        : "사용자 계정이 중지되었습니다.",
    user: updatedUser,
  });
}

    /* 비밀번호 변경 */
    if (
      action === "password"
    ) {
      const password =
        String(
          body.password || ""
        );

      if (
        password.length < 6
      ) {
        return NextResponse.json(
          {
            message:
              "비밀번호는 6자 이상 입력해주세요.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        !targetUser.auth_user_id
      ) {
        return NextResponse.json(
          {
            message:
              "Auth 사용자 정보가 없습니다.",
          },
          {
            status: 400,
          }
        );
      }

      const {
        error,
      } =
        await admin.auth.admin.updateUserById(
          targetUser.auth_user_id,
          {
            password,
          }
        );

      if (error) {
        throw error;
      }

      return NextResponse.json({
        message:
          "비밀번호가 변경되었습니다.",
      });
    }

    return NextResponse.json(
      {
        message:
          "잘못된 요청입니다.",
      },
      {
        status: 400,
      }
    );
  } catch (error: any) {
    console.error(
      "사용자 수정 오류:",
      error?.message
    );

    return NextResponse.json(
      {
        message:
          error?.message ||
          "사용자 수정 중 오류가 발생했습니다.",
      },
      {
        status: 500,
      }
    );
  }
}