import { home } from "@/router/enums";
const Layout = () => import("@/layout/index.vue");

export default {
  path: "/",
  name: "Home",
  component: Layout,
  redirect: "/dashboard/analysis",
  meta: {
    icon: "ep/home-filled",
    title: "首页",
    rank: home
  },
  children: [
    {
      path: "/welcome",
      name: "Welcome",
      redirect: "/dashboard/analysis",
      meta: {
        title: "首页",
        showLink: false
      }
    }
  ]
} satisfies RouteConfigsType;
